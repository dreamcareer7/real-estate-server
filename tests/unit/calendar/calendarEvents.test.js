// @ts-nocheck
const { expect } = require('chai')
const moment = require('moment-timezone')

const { createContext, handleJobs } = require('../helper')

const Calendar = require('../../../lib/models/Calendar')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')
const CrmTask = require('../../../lib/models/CRM/Task')
const List = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list_members')
const AttributeDef = require('../../../lib/models/Contact/attribute_def')

const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')

const Worker = require('../../../lib/models/CRM/Task/worker/notification')

let user, brand, def_ids_by_name, TAG


async function setup(without_checklists = false) {
  user = await User.getByEmail('test@rechat.com')

  const brand_data = {
    roles: {
      Admin: [user.id]
    }
  }

  if (without_checklists) {
    brand_data.contexts = []
    brand_data.checklists = []
  }

  brand = await BrandHelper.create(brand_data)
  Context.set({ user, brand })

  def_ids_by_name = await AttributeDef.getDefsByName(brand.id)
  TAG = def_ids_by_name.get('tag')
}

async function fetchEvents(low = moment().add(-1, 'year').unix(), high = moment().add(1, 'year').unix()) {
  return Calendar.filter([{
    brand: brand.id,
    users: [user.id]
  }], {
    high,
    low
  })
}

async function createTask(contact_associations) {
  const task = await CrmTask.create({
    created_by: user.id,
    assignees: [user.id],
    brand: brand.id,
    associations: contact_associations.map(a => ({
      association_type: 'contact',
      contact: a
    })),
    due_date: Date.now() / 1000 + 24 * 3600,
    title: 'Fire Missile',
    status: 'DONE',
    task_type: 'Call'
  })

  await handleJobs()

  await Worker.sendNotifications()
  await handleJobs()

  return task
}

async function createList() {
  const id = await List.create(user.id, brand.id, {
    name: 'Warriors List',
    filters: [
      {
        attribute_def: TAG,
        value: 'Warriors List'
      }
    ],
    is_editable: true,
    touch_freq: 30
  })

  await handleJobs()

  const list = await List.get(id)

  expect(list).not.to.be.undefined

  return list
}

async function createContact(data) {
  const res = await Contact.create(
    data.map(c => ({ ...c, attributes: attributes(c.attributes), user: user.id })),
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return res
}

async function handleList() {
  const list = await createList()

  const data = require('./data/contact.json')
  const contact_ids = await createContact(data)

  await ListMember.findByListId(list.id)

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.have.length(1)

  return { contact }
}


async function testContactEvent() {
  await handleList()

  const events = await fetchEvents()

  expect(events).not.to.be.undefined
  expect(events[0].users).to.be.an('array')
  expect(events[0]).to.include({
    object_type: 'contact',
    event_type: 'next_touch',
    type_label: 'Next Touch',
    title: 'saeed rechat',
    type: 'calendar_event'
  })
}

async function testContactAttributeEvent() {
  await Contact.create([
    {
      user: user.id,
      attributes: attributes({
        first_name: 'saeed',
        last_name: 'rechat',
        child_birthday: {
          label: 'Matthew',
          date: moment().add(10, 'days').year(1998).unix()
        }
      })
    }
  ], user.id, brand.id )

  await handleJobs()

  const events = await fetchEvents()

  expect(events).not.to.be.undefined
  expect(events[0].users).to.be.an('array')
  expect(events[0]).to.include({
    object_type: 'contact_attribute',
    event_type: 'child_birthday',
    type_label: 'Child Birthday (Matthew)',
    title: 'Child Birthday (Matthew) - saeed rechat',
    type: 'calendar_event'
  })
}

async function testCRMTaskEvent() {
  const contact_ids = await Contact.create([
    {
      user: user.id,
      attributes: attributes({
        first_name: 'firstName',
        last_name: 'lastName'
      })
    }
  ], user.id, brand.id )

  await handleJobs()

  await createTask([contact_ids[0]])
  const events = await fetchEvents()

  expect(events).not.to.be.undefined
  expect(events[0].users).to.be.an('array')
  expect(events[0]).to.include({
    object_type: 'crm_task',
    event_type: 'Call',
    type_label: 'Call',
    title: 'Fire Missile',
    type: 'calendar_event'
  })
}

async function testEmailCampaignEvent() {
}



describe('Calendar Events', () => {
  createContext()

  beforeEach(setup)

  it('should return contact event', testContactEvent)
  it('should return contact attribute event', testContactAttributeEvent)
  it('should return CRM Task event', testCRMTaskEvent)
  it('should return Email Campaign event', testEmailCampaignEvent)
})
