const moment = require('moment-timezone')
const { assert, expect } = require('chai')
// const _ = require('lodash')

const Trigger = {
  ...require('../../../lib/models/Trigger/create'),
  ...require('../../../lib/models/Trigger/due'),
  ...require('../../../lib/models/Trigger/get'),
  ...require('../../../lib/models/Trigger/filter'),
  ...require('../../../lib/models/Trigger/delete'),
  ...require('../../../lib/models/Trigger/worker'),
}
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const EmailCampaign = {
  ...require('../../../lib/models/Email/campaign/create'),
  ...require('../../../lib/models/Email/campaign/get'),
}
const Orm = require('../../../lib/models/Orm/context')
const Context = require('../../../lib/models/Context')

const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')
const UserHelper = require('../user/helper')

const { createContext, handleJobs } = require('../helper')
const sql = require('../../../lib/utils/sql')

const BIRTHDAY = moment.utc().add(3, 'days').startOf('day').add(-20, 'years')
let brand

async function setup() {
  const user = await UserHelper.TestUser()
  brand = await createBrand()
  
  Context.set({ user, brand })

  await handleJobs()
}

const createBrand = async () => {
  const user = await UserHelper.TestUser()
  return BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
  })
}

async function createContact() {
  const user = await UserHelper.TestUser()

  const [id] = await Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
      birthday: BIRTHDAY.unix()
    }),
  }], user.id, brand.id)

  await handleJobs()

  return Contact.get(id)
}

async function createCampaign() {
  const user = await UserHelper.TestUser()
  const brand = await createBrand()

  const [id] = await EmailCampaign.createMany([{
    brand: brand.id,
    created_by: user.id,
    due_at: null,
    from: user.id,
    html: '<div></div>',
    subject: 'Hello!',
    to: [{
      recipient_type: 'Email',
      email: 'john@doe.com',
    }],
  }])

  return id
}

/**
 * @param {Partial<import('../../../lib/models/Trigger/trigger').ITriggerInput>} triggerProps 
 * @returns {Promise<import('../../../lib/models/Trigger/trigger').IStoredTrigger & { trigger_object_type: 'contact' }>}
 */
const createTrigger = async (triggerProps = {}) => {
  const user = await UserHelper.TestUser()
  const campaign_id = await createCampaign()
  const contact = await createContact()

  /** @type {import('../../../lib/models/Trigger/trigger').ITriggerInput} */
  const trigger_data = {
    action: 'schedule_email',
    brand: brand.id,
    created_by: user.id,
    event_type: 'birthday',
    user: user.id,
    campaign: campaign_id,
    contact: contact.id,
    wait_for: -86400,
    time: '10:00:00',
    ...triggerProps
  }

  const ids = await Trigger.create([trigger_data])
  const [trigger] = await Trigger.getAll(ids)

  expect(trigger).to.include(trigger_data)

  return trigger
}

const testDueTrigger = async (triggerProps = {}) => {
  const trigger = await createTrigger(triggerProps)
  const due = await Trigger.getDueTriggers()
  expect(due).to.have.members([trigger.id])
}

const testExecuteTrigger = async (triggerProps = {}) => {
  const user = await UserHelper.TestUser()
  const { id } = await createTrigger(triggerProps)

  await Trigger.executeDue()
  await handleJobs()

  const trigger = await Trigger.get(id)
  expect(trigger.executed_at).not.be.null

  if (!trigger.campaign) {
    throw new Error('Trigger should have a campaign!')
  }

  const campaign = await EmailCampaign.get(trigger.campaign)

  if (!campaign.due_at) {
    throw new Error('Trigger\'s campaign should have a due date!')
  }

  const actual = moment(campaign.due_at * 1000).tz(user.timezone)
  const expected = BIRTHDAY.clone().year(BIRTHDAY.year() + 20).add(12, 'hours').tz(user.timezone).startOf('day').add(-1, 'day').add(10, 'hours')

  expect(campaign.due_at, `Expected "${actual.format()}" to be equal "${expected.format()}" which is the same day as "${BIRTHDAY.format()}"`).to.be.eq(expected.unix())

  return { trigger, campaign }
}

const testExecuteRecurringTrigger = async (triggerProps = {}) => {
  const trigger = await createTrigger({ recurring: true, ...triggerProps })
  const { timestamp } = await Trigger.getDue(trigger.id)

  Orm.setEnabledAssociations(['contact.triggers'])
  const { triggers: triggersBeforeExecute } = await Contact.get(trigger.contact)
  expect(triggersBeforeExecute).to.have.members([trigger.id])

  await Trigger.executeDue()
  await handleJobs()

  const contactTriggers = await Trigger.filter({ contacts: [ trigger.contact ], order: '-created_at' })
  expect(contactTriggers).to.have.length(2)

  const { triggers: triggersAfterExecute } = await Contact.get(trigger.contact)
  expect(triggersAfterExecute).to.have.members([ trigger.id ])

  const clonedTrigger = await Trigger.get(contactTriggers[0])
  expect(clonedTrigger.scheduled_after).to.be.equal(trigger.id)

  if (!clonedTrigger.campaign) {
    assert.fail('expected the cloned trigger to have a campaign')
  }

  await handleJobs()

  const emailCampaignRecipients = await sql.selectOne('SELECT * FROM email_campaigns_recipients WHERE campaign = $1', [clonedTrigger.campaign])
  expect(emailCampaignRecipients).to.be.ok

  const expected = timestamp - clonedTrigger.wait_for + 86400
  expect(clonedTrigger.effective_at, `expected ${new Date(clonedTrigger.effective_at * 1000).toISOString()} be equal to ${new Date(expected * 1000).toISOString()}`).to.be.equal(expected)

  expect(await Trigger.getDueTriggers(), 'The next recurrence should not go into effect until after the first one').to.be.empty
}

const testDeleteExecutedTrigger = async () => {
  const { trigger } = await testExecuteTrigger()

  await Trigger.delete([trigger.id], trigger.user)

  const campaign = await EmailCampaign.get(trigger.campaign)
  expect(campaign.deleted_at).not.be.null
}

const testDeleteContactHavingATrigger = async () => {
  const trigger = await createTrigger()
  await Contact.delete([trigger.contact], trigger.created_by)
  await handleJobs()
  const triggerNow = await Trigger.get(trigger.id)
  expect(triggerNow.deleted_at).to.be.ok
}

const testDeleteContactHavingAnExecutedTrigger = async () => {
  const trigger = await createTrigger()
  await Trigger.execute(trigger.id)
  await handleJobs()
  await Contact.delete([trigger.contact], trigger.created_by)
  await handleJobs()
  const triggerNow = await Trigger.get(trigger.id)
  expect(triggerNow.deleted_at).to.be.ok
  const campaign = await EmailCampaign.get(trigger.campaign)
  expect(campaign.deleted_at).to.be.ok
}

const createContactlessTrigger = async () => {
  await createTrigger({ contact: null, event_type: 'easter' })
}

const createHoliday = async() => {
  await sql.query(`
    INSERT INTO holidays
      (created_at, updated_at, name, template_type, starts_at, ends_at)
      VALUES (NOW(), NOW(), $1, $2, $3, $4) 
  `, [
    'easter',
    'Easter',
    moment.utc().add(3, 'days').toISOString(),
    moment.utc().add(2, 'years').add(2, 'days').toISOString()
  ])
}

const testDueContactlessTrigger = async(createTheHoliday = true) => {
  if (createTheHoliday) {
    await createHoliday()
  }
  await testDueTrigger({ contact: null, event_type: 'easter' })
}

const testExecuteContactlessTrigger = async(createTheHoliday = true) => {
  if (createTheHoliday) {
    await createHoliday()
  }
  await testExecuteTrigger({ contact: null, event_type: 'easter' })
}

// NOT IMPLEMENTED YET! The prevention of duplicate triggers.

// const testCreatingDoubleContactlessTriggers = async () => {
//   await createHoliday()
//   await createContactlessTrigger()
//   return (testDueContactlessTrigger())
//     .catch((e) => null)
//     .then(() => { assert.fail('created double holiday triggers!') })
// }

describe('Trigger', () => {
  createContext()
  beforeEach(setup)

  it('should create a trigger successfully', createTrigger)
  it('should identify due tiggers', testDueTrigger)
  it('should execute triggers 3 days before due', testExecuteTrigger)
  it('should delete associated campaign if not executed yet', testDeleteExecutedTrigger)
  it('should create another trigger after recurring trigger is executed', testExecuteRecurringTrigger)
  it('should delete a trigger when the contact is deleted', testDeleteContactHavingATrigger)
  it('should delete campaigns and triggers when a contact is deleted', testDeleteContactHavingAnExecutedTrigger)

  context('holiday triggers', () => {
    it('should create a trigger without a contact successfully', createContactlessTrigger)
    it('should identify a due tigger without a contact', testDueContactlessTrigger)
    it('should execute a trigger without a contact, 3 days before due', testExecuteContactlessTrigger)
    // it('cannot be made double on the same event', testCreatingDoubleContactlessTriggers)
  })
})
