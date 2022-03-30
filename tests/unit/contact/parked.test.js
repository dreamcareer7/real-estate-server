const { expect } = require('chai')

const BrandFlow = require('../../../lib/models/Brand/flow')
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const Context = require('../../../lib/models/Context')
const Flow = require('../../../lib/models/Flow/enroll')
const User = require('../../../lib/models/User/get')

const BrandHelper = require('../brand/helper')
const { createContext, handleJobs } = require('../helper')
const { attributes } = require('./helper')
const { create } = require('./data/attribute.json')

let user, brand

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
        wait_for: { days: 1},
        time: '08:00:00',
        is_automated: false,
        order: 1,
        event_type: 'last_step_date',
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

async function testUnparkOnFlowEnroll() {
  const [contact] = await createContact([create[0]])
  const [flow] = await BrandFlow.forBrand(brand.id)
  await Flow.enrollContacts(brand.id, user.id, flow.id, Date.now() / 1000, flow.steps, [contact])

  await handleJobs()

  const updated = await Contact.get(contact)
  expect(updated.parked).to.be.false
}

async function testNewParkedContactWithEmail() {
  const parked = [false, true]
  let counter = 0
  const newContactEmails = ['new1@contact.com', 'new2@contact.com']
  const contactsIds = await Contact.create(newContactEmails.map(contactEmail => {
    counter++
    return {
      user: user.id,
      attributes: [{ attribute_type: 'source_type', text: 'Google' }, { attribute_type: 'email', text: contactEmail }],
      parked: parked[counter - 1]
    }
  }), user.id, brand.id, 'direct_request', { activity: false, get: false })
  
  const contacts = await Contact.getAll(contactsIds)

  expect(contacts[0]['parked']).to.be.false
  expect(contacts[1]['parked']).to.be.true
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Parked', () => {
    it('Updating a contact puts it out of parked state', testUnparkOnUpdate)
    it('Enroll a contact into a flow puts it out of parked state', testUnparkOnFlowEnroll)
    it('Create new parked contacts with email', testNewParkedContactWithEmail)
  })
})
