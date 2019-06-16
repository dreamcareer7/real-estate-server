const { expect } = require('chai')

const BrandFlow = require('../../../lib/models/Brand/flow')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const EmailCampaign = require('../../../lib/models/Email/campaign')
const Calendar = require('../../../lib/models/Calendar')
const Flow = require('../../../lib/models/Flow')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const { createContext, handleJobs } = require('../helper')
const BrandHelper = require('../brand/helper')

let user, brand, brand_flow

const HOUR = 3600
const DAY = 24 * HOUR

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
        due_in: 0,
        is_automated: false,
        event: {
          title: 'Create Rechat email',
          task_type: 'Other',
        }
      }, {
        title: 'Send them a test email',
        description: 'Automatically send them a test email to make sure it\'s working',
        due_in: 8 * HOUR + DAY,
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
        due_in: 3 * DAY,
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

async function createContact() {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Abbas'
          },
          {
            attribute_type: 'email',
            text: 'abbas@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag1'
          },
          {
            attribute_type: 'tag',
            text: 'Tag2'
          }
        ]
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
  const tasks = await CrmTask.getForUser(user.id, brand.id, {})

  expect(tasks).to.have.length(2)

  const campaigns = await EmailCampaign.getByBrand(brand.id)
  expect(campaigns).to.have.length(1)

  return flow
}

async function testStopFlow() {
  const flow = await testEnrollContact()

  await Flow.stop(user.id, flow.id)

  const events = await Calendar.filter(null, {
    high: Date.now() / 1000 + 100 * DAY,
    low: Date.now() / 1000 - 100 * DAY,
    object_types: ['crm_task', 'email_campaign']
  })

  expect(events).to.have.length(1)
}

describe('Flow', () => {
  createContext()
  beforeEach(setup)

  it('should setup brand flows correctly', testBrandFlows)
  it('should enroll a contact to a flow', testEnrollContact)
  it('should stop a flow instance and delete all future events', testStopFlow)
})
