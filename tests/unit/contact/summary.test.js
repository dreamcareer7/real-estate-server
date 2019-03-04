const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const ContactAttribute = require('../../../lib/models/Contact/attribute')
const ContactSummary = require('../../../lib/models/Contact/summary')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

let user, brand, contact

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
  })
  Context.set({ user, brand })

  await createContact()
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

  Orm.setEnabledAssociations(['contact.attributes'])
  const model = await Contact.get(ids[0])
  const populated = await Orm.populate({
    models: [model],
    associations: ['contact.attributes']
  })
  contact = populated[0]
}

async function testDeleteAttribute() {
  const attr = contact.attributes.find(a => a.attribute_type === 'email')

  await ContactAttribute.delete([attr.id], user.id)
  await handleJobs()

  const summaries = await ContactSummary.getAll([contact.id])
  expect(summaries[0].email).to.be.null
}

async function testAddAttribute() {
  await Contact.addAttributes(user.id, brand.id, contact.id, [{
    attribute_type: 'phone_number',
    text: '+989123456789',
    is_primary: true,
    is_partner: false
  }])
  await handleJobs()

  const summaries = await ContactSummary.getAll([contact.id])
  expect(summaries[0].phone_number).to.be.equal('+989123456789')
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', () => {
    it('should update summary after deleting an attribute', testDeleteAttribute)
    it('should update summary after adding an attribute', testAddAttribute)
  })
})
