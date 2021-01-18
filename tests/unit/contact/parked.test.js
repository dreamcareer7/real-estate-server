const { expect } = require('chai')

const BrandFlow = require('../../../lib/models/Brand/flow')
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const CrmTask = require('../../../lib/models/CRM/Task/upsert')
const Context = require('../../../lib/models/Context')
const Flow = require('../../../lib/models/Flow/upsert')
const User = require('../../../lib/models/User/get')

const BrandHelper = require('../brand/helper')
const { createContext, handleJobs } = require('../helper')
const { attributes } = require('./helper')
const { create } = require('./data/attribute.json')

let user, brand

const HOUR = 3600
const DAY = 24 * HOUR

/**
 * @param {any[]} data
 */
async function createContact(data) {
  const res = await Contact.create(
    data.map((c) => ({ ...c, attributes: attributes(c.attributes), user: user.id, parked: true })),
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return res
}

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id],
    },
    checklists: [],
    contexts: [],
    flows: [{
      created_by: user.id,
      name: 'Rechat Team Onboarding',
      description: 'The process of on-boarding a new team member',
      steps: [{
        title: 'Create Rechat email',
        description: 'Create a Rechat email address for the new guy to use in other services',
        due_in: 8 * HOUR + DAY,
        is_automated: false,
        event: {
          title: 'Create Rechat email',
          task_type: 'Other',
        }
      }]
    }]
  })
  await handleJobs()

  Context.set({ user, brand })
}

async function testUnparkOnUpdate() {
  const [contact] = await createContact([create[0]])

  await Contact.update([{
    id: contact,
    attributes: [{
      attribute_type: 'tag',
      text: 'New Tag'
    }]
  }], user.id, brand.id)

  await handleJobs()

  const updated = await Contact.get(contact)
  expect(updated.parked).to.be.false
}

async function testUnparkOnCrmTask() {
  const [contact] = await createContact([create[0]])

  await CrmTask.create({
    brand: brand.id,
    created_by: user.id,
    due_date: Date.now() / 1000,
    status: 'PENDING',
    task_type: 'Call',
    title: 'Called Jay',
    associations: [{
      association_type: 'contact',
      contact,
    }]
  })

  await handleJobs()

  const updated = await Contact.get(contact)
  expect(updated.parked).to.be.false
}

async function testUnparkOnFlowEnroll() {
  const [contact] = await createContact([create[0]])
  const [flow] = await BrandFlow.forBrand(brand.id)
  await Flow.enrollContacts(brand.id, user.id, flow.id, Date.now() / 1000, flow.steps, [contact])

  await handleJobs()

  const updated = await Contact.get(contact)
  expect(updated.parked).to.be.false
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Parked', () => {
    it('Updating a contact puts it out of parked state', testUnparkOnUpdate)
    it('Adding a contact to an event puts it out of parked state', testUnparkOnCrmTask)
    it('Enroll a contact into a flow puts it out of parked state', testUnparkOnFlowEnroll)
  })
})
