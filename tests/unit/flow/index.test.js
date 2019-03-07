const { expect } = require('chai')

const BrandFlow = require('../../../lib/models/Brand/flow')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const Flow = require('../../../lib/models/Flow')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const { createContext, handleJobs } = require('../helper')
const BrandHelper = require('../brand/helper')

let user, brand, flow

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
        event: {
          title: 'Create Rechat email',
          task_type: 'Other',
        }
      }, {
        title: 'Demo of Rechat',
        description: 'Dan gives a quick demo of the Rechat system and explains how it works',
        due_in: 3,
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

  flow = populated[0]
}

async function testBrandFlows() {
  expect(flow.steps).to.have.length(2)
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
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return ids[0]
}

async function testEnrollContact() {
  const id = await createContact()

  await Flow.enrollContacts(brand.id, user.id, flow.id, Date.now() / 1000, flow.steps.map(s => s.id), [id])
  const tasks = await CrmTask.getForUser(user.id, brand.id, {})

  expect(tasks).to.have.length(2)
}

describe('Flow', () => {
  createContext()
  beforeEach(setup)

  it('should setup brand flows correctly', testBrandFlows)
  it('should enroll a contact to a flow', testEnrollContact)
})
