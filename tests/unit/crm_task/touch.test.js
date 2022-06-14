const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')

const AttributeDef = require('../../../lib/models/Contact/attribute_def/get')
const Contact = require('../../../lib/models/Contact')
const ContactTag = require('../../../lib/models/Contact/tag')
const List = require('../../../lib/models/Contact/list/manipulate')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm/context')
const CrmTask = require('../../../lib/models/CRM/Task')
const CrmAssociation = require('../../../lib/models/CRM/Association')
const EmailCampaign = require('../../../lib/models/Email/campaign')

const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const UserHelper = require('../user/helper')
const { attributes } = require('../contact/helper')
const { createGoogleMessages } = require('../google/helper')
const { createMicrosoftMessages } = require('../microsoft/helper')

/** @type {IUser} */
let user

/** @type {IBrand} */
let brand

const WARM_LIST_TOUCH_FREQ = 30
const HOT_LIST_TOUCH_FREQ = 10

async function setup() {
  user = await UserHelper.TestUser()

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    contexts: [],
    checklists: []
  })

  Context.set({ user, brand })

  await createList()
  await prepareHotListTag()
}

const DEFAULT_CONTACTS = [{
  first_name: 'Abbas',
  email: ['abbas@rechat.com'],
  tag: ['Warm']
}, {
  first_name: 'Emil',
  email: ['emil@rechat.com']
}]

async function createContact(attributeSets = DEFAULT_CONTACTS) {
  const ids = await Contact.create(
    attributeSets.map(a => ({
      user: user.id,
      attributes: attributes(a)
    })),
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids
}

async function createTask(contact_associations) {
  const task = await CrmTask.create({
    created_by: user.id,
    brand: brand.id,
    associations: contact_associations.map(a => ({
      association_type: 'contact',
      contact: a
    })),
    due_date: Date.now() / 1000 - 24 * 3600,
    title: 'Called him',
    status: 'DONE',
    task_type: 'Call'
  })

  await handleJobs()

  return task
}

async function createList() {
  const defs = await AttributeDef.getDefsByName(brand.id)

  const id = List.create(user.id, brand.id, {
    name: 'Warm',
    touch_freq: WARM_LIST_TOUCH_FREQ,
    filters: [{
      attribute_def: /** @type {UUID} */ (defs.get('tag')),
      value: 'Warm'
    }]
  })

  await handleJobs()

  return id
}

function prepareHotListTag() {
  return ContactTag.update_touch_frequency(brand.id, user.id, 'Hot', HOT_LIST_TOUCH_FREQ)
}

async function testTouchDatesAfterGmailSync() {
  const contact_ids = await createContact([{
    first_name: 'Saeed',
    tag: ['Hot'],
    email: ['saeed.vayghan@gmail.com']
  }, DEFAULT_CONTACTS[1]])

  await createGoogleMessages(user, brand)
  await handleJobs()

  await contactShould(contact_ids[0], c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    if (!c.next_touch) throw new Error('Next touch was not set properly.')

    const lt = moment.unix(c.last_touch)
    const nt = moment.unix(c.next_touch)

    const expected_last_touch = new Date('2019-08-05T13:32:52.000Z')
    expect(c.last_touch).to.be.equal(expected_last_touch.getTime() / 1000)
    expect(c.next_touch - c.last_touch).to.be.equal(HOT_LIST_TOUCH_FREQ * 24 * 3600 + (lt.utcOffset() - nt.utcOffset()) * 60)
  })

  await contactShould(contact_ids[1], c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })
}

async function testTouchDatesAfterOutlookSync() {
  const contact_ids = await createContact([{
    first_name: 'Saeed',
    tag: ['Hot'],
    email: ['saeed.vayghan@gmail.com']
  }, DEFAULT_CONTACTS[1]])

  await createMicrosoftMessages(user, brand)
  await handleJobs()

  await contactShould(contact_ids[0], c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    if (!c.next_touch) throw new Error('Next touch was not set properly.')
  
    const lt = moment.unix(c.last_touch)
    const nt = moment.unix(c.next_touch)
  
    const expected_last_touch = new Date('2019-08-01T06:23:19Z')
    expect(c.last_touch).to.be.equal(expected_last_touch.getTime() / 1000)
    expect(c.next_touch - c.last_touch).to.be.equal(HOT_LIST_TOUCH_FREQ * 24 * 3600 + (lt.utcOffset() - nt.utcOffset()) * 60)
  })

  await contactShould(contact_ids[1], c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })
}

async function testTouchDates() {
  const contact_ids = await createContact()
  const task = await createTask(contact_ids.slice(0, 1))

  const c = await Contact.get(contact_ids[0])

  if (!c.last_touch) throw new Error('Last touch was not set properly.')
  if (!c.next_touch) throw new Error('Next touch was not set properly.')

  const lt = moment.unix(c.last_touch)
  const nt = moment.unix(c.next_touch)

  expect(c.last_touch).to.be.equal(task.due_date)
  expect(c.next_touch - c.last_touch).to.be.equal(WARM_LIST_TOUCH_FREQ * 24 * 3600 + (lt.utcOffset() - nt.utcOffset()) * 60)

  const { ids } = await Contact.fastFilter(brand.id, [], {
    last_touch_gte: Date.now() / 1000 - 7 * 24 * 3600
  })

  expect(ids).to.have.length(1)
  expect(ids[0]).to.equal(c.id)

  return contact_ids
}

/**
 * @param {UUID} id 
 * @param {(contact: IContact) => void} fn 
 */
async function contactShould(id, fn) {
  const contact = await Contact.get(id)
  return fn(contact)
}

async function testLastTouchAfterRemovedFromEvent() {
  Orm.setEnabledAssociations([ 'crm_task.associations' ])

  const [contact_1, contact_2] = await createContact()
  const task = await createTask([contact_1])

  await handleJobs()

  await contactShould(contact_1, c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    expect(c.last_touch).to.be.equal(task.due_date)
  })

  await contactShould(contact_2, c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })

  await CrmAssociation.remove(task.associations || [], task.id, user.id)
  await handleJobs()

  await contactShould(contact_1, c => {
    if (c.last_touch) throw new Error('Last touch was not cleared properly.')
  })
}

async function testLastTouchAfterEventIsDeleted() {
  Orm.setEnabledAssociations([ 'crm_task.associations' ])

  const [contact_1, contact_2] = await createContact()
  const task = await createTask([contact_1])

  await handleJobs()

  await contactShould(contact_1, c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    expect(c.last_touch).to.be.equal(task.due_date)
  })

  await contactShould(contact_2, c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })

  await CrmTask.remove([task.id], user.id)
  await handleJobs()

  await contactShould(contact_1, c => {
    if (c.last_touch) throw new Error('Last touch was not cleared properly.')
  })
}

async function testTouchDatesAfterEmailCampaign() {
  const d = new Date('2019-11-11')
  const { now } = await sql.selectOne('SELECT extract(epoch from now()) AS now')
  const contact_ids = await createContact()

  /** @type {IEmailCampaignInput} */
  const campaign = {
    due_at: d.toISOString(),
    from: user.id,
    to: [
      {
        email: 'abbas@rechat.com',
        recipient_type: 'Email'
      }
    ],
    subject: 'testEmailOnly',
    html: 'test',
    brand: brand.id,
    created_by: user.id
  }

  await EmailCampaign.createMany([campaign])
  await EmailCampaign.sendDue()

  await handleJobs()

  await contactShould(contact_ids[0], c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    if (!c.next_touch) throw new Error('Next touch was not set properly.')
  
    const lt = moment.unix(c.last_touch)
    const nt = moment.unix(c.next_touch)
  
    expect(c.last_touch, 'Last touch should be same as email execution time').to.be.equal(now)
    expect(c.next_touch - c.last_touch).to.be.equal(WARM_LIST_TOUCH_FREQ * 24 * 3600 + (lt.utcOffset() - nt.utcOffset()) * 60)
  })

  await contactShould(contact_ids[1], c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })
}

async function testTouchDatesOnContactEmailManipulation() {
  const d = new Date('2019-11-11')
  const { now } = await sql.selectOne('SELECT extract(epoch from now()) AS now')

  /** @type {IEmailCampaignInput} */
  const campaign = {
    due_at: d.toISOString(),
    from: user.id,
    to: [
      {
        email: 'abbas@rechat.com',
        recipient_type: 'Email'
      }
    ],
    subject: 'testEmailOnly',
    html: 'test',
    brand: brand.id,
    created_by: user.id
  }

  await EmailCampaign.createMany([campaign])
  await EmailCampaign.sendDue()

  await handleJobs()

  const contact_ids = await createContact()
  await contactShould(contact_ids[0], c => {
    if (!c.last_touch) throw new Error('Last touch was not set properly.')
    if (!c.next_touch) throw new Error('Next touch was not set properly.')
  
    const lt = moment.unix(c.last_touch)
    const nt = moment.unix(c.next_touch)
  
    expect(c.last_touch, 'Last touch should be same as email execution time').to.be.equal(now)
    expect(c.next_touch - c.last_touch).to.be.equal(WARM_LIST_TOUCH_FREQ * 24 * 3600 + (lt.utcOffset() - nt.utcOffset()) * 60)
  })

  await contactShould(contact_ids[1], c => {
    expect(c.last_touch, 'Last touch was set on the wrong contact.').to.be.null
    expect(c.next_touch, 'Next touch was set on the wrong contact.').to.be.null
  })
}

async function testSortByLastTouch() {
  const contact_ids = await createContact()
  await createTask(contact_ids.slice(0, 1))

  const { ids } = await Contact.fastFilter(brand.id, [], {
    order: '-last_touch'
  })

  const contacts = await Contact.getAll([...ids], user.id)

  expect(contacts).to.have.length(2)
  expect(contacts[0].last_touch).not.to.be.null
  expect(contacts[1].last_touch).to.be.null
}

async function testTouchReminderOnContact() {
  const [id] = await createContact()

  await ContactTag.update_touch_frequency(brand.id, user.id, 'Warm', 10)
  await handleJobs()
  
  const contact = await Contact.get(id)

  expect(contact.touch_freq).to.be.equal(10)
}

describe('Touch', () => {
  createContext()
  beforeEach(setup)

  it('should update touch dates after a contact is attached to a crm_task', testTouchDates)
  it('should put touch_freq on contact object', testTouchReminderOnContact)
  it('should sort correctly by touch dates putting nulls last in descending order', testSortByLastTouch)
  it('should update touch dates after an email is sent to contact', testTouchDatesAfterEmailCampaign)
  it('should update touch dates after Gmail sync', testTouchDatesAfterGmailSync)
  it('should update touch dates after Outlook sync', testTouchDatesAfterOutlookSync)
  it('should update touch dates for new contacts', testTouchDatesOnContactEmailManipulation)
  it('should update touch dates after contact is removed from event', testLastTouchAfterRemovedFromEvent)
  it('should update touch dates after event is deleted', testLastTouchAfterEventIsDeleted)
})
