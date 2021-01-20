const { expect } = require('chai')
const moment = require('moment-timezone')

const BrandFlow = require('../../../lib/models/Brand/flow/get')
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const Calendar = require('../../../lib/models/Calendar')
const Flow = require('../../../lib/models/Flow')
const FlowStep = require('../../../lib/models/Flow/step/get')
const Orm = {
  ...require('../../../lib/models/Orm/index'),
  ...require('../../../lib/models/Orm/context'),
}
const User = require('../../../lib/models/User/get')

const Trigger = {
  ...require('../../../lib/models/Trigger/get'),
  ...require('../../../lib/models/Trigger/due'),
}

const { createContext, handleJobs } = require('../helper')
const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')

let user, brand, brand_flow

const HOUR = 3600
const DAY = 24 * HOUR

const CONTACT = {
  first_name: 'Abbas',
  email: 'abbas@rechat.com',
  tag: ['Tag1', 'Tag2'],
}

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    flows: [{
      created_by: user.id,
      name: 'Rechat Team Onboarding',
      description: 'The process of on-boarding a new team member',
      steps: [{
        title: 'Create Rechat email',
        description: 'Create a Rechat email address for the new guy to use in other services',
        wait_for: DAY,
        time: '08:00:00',
        is_automated: false,
        event: {
          title: 'Create Rechat email',
          task_type: 'Other',
        }
      }, {
        title: 'Send them a test email',
        description: 'Automatically send them a test email to make sure it\'s working',
        wait_for: DAY,
        time: '08:00:00',
        is_automated: true,
        email: {
          name: 'Onboarding Email',
          goal: 'Test email for new team members',
          subject: 'Test email from Rechat',
          include_signature: false,
          body: 'Hey, this is a test!',
        }
      }, {
        title: 'Demo of Rechat',
        description: 'Dan gives a quick demo of the Rechat system and explains how it works',
        wait_for: 2 * DAY,
        time: '10:00:00',
        is_automated: false,
        event: {
          title: 'Demo of Rechat',
          task_type: 'Call',
        }
      }]
    }]
  })

  Context.set({ user, brand })

  await loadFlow()
}

async function loadFlow() {
  const models = await BrandFlow.forBrand(brand.id)
  expect(models).to.have.length(1)

  const populated = await Orm.populate({
    models,
    associations: [
      'brand_flow.steps',
      'brand_flow_step.event'
    ]
  })

  brand_flow = populated[0]
}

async function testBrandFlows() {
  expect(brand_flow.steps).to.have.length(3)
}

async function createContact(attrs = CONTACT) {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: attributes(attrs)
      }
    ],
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids[0]
}

async function testEnrollContact() {
  const id = await createContact()

  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])

  return { flow, contact: id }
}

async function testFlowProgress() {
  const { flow, contact: contact_id } = await testEnrollContact()

  await Trigger.executeDue()
  await handleJobs()

  const tasks = await CrmTask.getForUser(user.id, brand.id, {})

  expect(tasks, 'A crm task should\'ve been created as the result of the first step').to.have.length(1)

  const due_date = tasks[0].due_date
  expect(due_date).to.be.equal(moment.tz(user.timezone).startOf('day').add(1, 'days').add(8, 'hours').unix())

  const campaigns = await EmailCampaign.getByBrand(brand.id)
  expect(campaigns).to.have.length(1)

  Orm.setEnabledAssociations(['contact.triggers'])
  const contact = await Contact.get(contact_id)
  expect(contact.triggers).to.have.length(1)

  const { steps } = await Flow.get(flow.id)
  expect(steps, 'Two steps should be present after the first one was executed').to.have.length(2)

  const flow_steps = await FlowStep.getAll(steps)
  expect(flow_steps[0].crm_task).to.be.equal(tasks[0].id)
  expect(flow_steps[0].executed_at).not.to.be.null
  expect(flow_steps[1].executed_at).to.be.null
  expect(flow_steps[1].crm_task).to.be.null
  expect(flow_steps[1].campaign).to.be.null

  const trigger = await Trigger.get(contact.triggers[0])
  expect(trigger.flow_step).to.be.equal(steps[0])
}

async function testFlowProgressFail() {
  const attrs = { ...CONTACT }
  delete attrs.email

  const id = await createContact(attrs)
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])

  await Trigger.executeDue()
  await handleJobs()

  const { steps } = await Flow.get(flow.id)
  expect(steps, 'Three steps should be present after the second one failed to be schedule').to.have.length(3)

  const flow_steps = await FlowStep.getAll(steps)

  expect(flow_steps[1].failed_at).to.be.a('number')
}

async function testDuplicateEnroll() {
  const id = await createContact()

  await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])
  const res = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])

  expect(res).to.be.empty
}

async function testStopFlowByDeleteContact() {
  const id = await createContact()
  const [flow] = await Flow.enrollContacts(brand.id, user.id, brand_flow.id, Date.now() / 1000, brand_flow.steps.map(s => s.id), [id])
  await handleJobs()

  await Contact.delete([id], user.id)
  await handleJobs()

  const deleted = await Flow.get(flow.id)
  expect(deleted.deleted_at).not.to.be.null
}

async function testStopFlow() {
  const { flow } = await testEnrollContact()

  await Flow.stop(user.id, flow.id)

  const events = await Calendar.filter(null, {
    high: Date.now() / 1000 + 100 * DAY,
    low: Date.now() / 1000 - 100 * DAY,
    object_types: ['crm_task', 'email_campaign']
  })

  expect(events).to.be.empty
}

describe('Flow', () => {
  createContext()
  beforeEach(setup)

  it('should setup brand flows correctly', testBrandFlows)
  it('should enroll a contact to a flow', testEnrollContact)
  it('should progress to next step', testFlowProgress)
  it('should mark next step as failed in case of failure', testFlowProgressFail)
  it('should prevent duplicate enrollment', testDuplicateEnroll)
  it('should stop a flow instance and delete all future events', testStopFlow)
  it('should stop a flow instance if contact deleted', testStopFlowByDeleteContact)
})
