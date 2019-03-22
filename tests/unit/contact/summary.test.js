const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const ContactAttribute = require('../../../lib/models/Contact/attribute')
const ContactSummary = require('../../../lib/models/Contact/summary')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const sql = require('../../../lib/utils/sql')

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

async function testCompanyContact() {
  const [id] = await Contact.create([{
    attributes: [{
      attribute_type: 'company',
      text: 'ACME Corp'
    }],
    user: user.id
  }], user.id, brand.id)

  await handleJobs()

  const contact = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(contact.search_field).to.be.equal('\'acme\':1C \'corp\':2C')

  const summary = await sql.selectOne('SELECT * FROM contacts_summaries WHERE id = $1', [id])
  expect(summary.search_field).to.be.equal('\'acme\':1C \'corp\':2C')
}

async function testEmptyContact() {
  const [id] = await Contact.create([{
    attributes: [{
      attribute_type: 'birthday',
      date: Date.now() / 1000
    }],
    user: user.id
  }], user.id, brand.id)

  await handleJobs()

  const contact = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(contact.search_field).to.be.equal('\'guest\':1')

  const summary = await sql.selectOne('SELECT * FROM contacts_summaries WHERE id = $1', [id])
  expect(summary.search_field).to.be.equal('\'guest\':1')
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', () => {
    it('should update summary after deleting an attribute', testDeleteAttribute)
    it('should update summary after adding an attribute', testAddAttribute)
    it('should update search field for company contacts', testCompanyContact)
    it('should update search field for an empty contact', testEmptyContact)
  })
})
