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
    'direct_request',
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
  await Contact.addAttributes(contact.id, [{
    attribute_type: 'phone_number',
    text: '+989123456789',
    is_primary: true,
    is_partner: false
  }], user.id, brand.id)
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

async function testGetSummaries() {
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
            attribute_type: 'company',
            text: 'my_company'
          },
          {
            attribute_type: 'email',
            text: 'abbas@rechat.com'
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
  Orm.setEnabledAssociations(['contact.attributes'])
  const model = await Contact.get(ids[0])
  const populated = await Orm.populate({
    models: [model],
    associations: ['contact.attributes']
  })
  const my_contact = populated[0]


  let summaries = await ContactSummary.getAll([my_contact.id])
  expect(summaries[0].display_name).to.be.equal('Abbas')


  // delete first_name attribute
  const first_name_attr = my_contact.attributes.find(a => a.attribute_type === 'first_name')
  await ContactAttribute.delete([first_name_attr.id], user.id)
  await handleJobs()
  summaries = await ContactSummary.getAll([my_contact.id])
  
  expect(summaries[0].first_name).to.be.null
  expect(summaries[0].display_name).to.be.equal('my_company')


  // delete email attribute
  const email_attr = my_contact.attributes.find(a => a.attribute_type === 'email')
  await ContactAttribute.delete([email_attr.id], user.id)
  await handleJobs()
  summaries = await ContactSummary.getAll([my_contact.id])

  expect(summaries[0].email).to.be.null
  expect(summaries[0].display_name).to.be.equal('my_company')


  // delete company attribute
  const company_attr = my_contact.attributes.find(a => a.attribute_type === 'company')
  await ContactAttribute.delete([company_attr.id], user.id)
  await handleJobs()
  summaries = await ContactSummary.getAll([my_contact.id])

  expect(summaries[0].company).to.be.null
  expect(summaries[0].display_name).to.be.equal('Guest')
}

async function testAddEmptyAttribute() {
  const old_summaries = await ContactSummary.getAll([contact.id])
  const old_middle_name = old_summaries[0].middle_name

  await Contact.addAttributes(contact.id, [{
    attribute_type: 'middle_name',
    text: '    ',
    is_primary: true,
    is_partner: false
  }], user.id, brand.id)
  await handleJobs()

  const new_summaries = await ContactSummary.getAll([contact.id])
  const new_middle_name = new_summaries[0].middle_name

  expect(old_middle_name).to.be.equal(new_middle_name)
}


describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Summary', () => {
    it('should update summary after deleting an attribute', testDeleteAttribute)
    it('should update summary after adding an attribute', testAddAttribute)
    it('should update search field for company contacts', testCompanyContact)
    it('should update search field for an empty contact', testEmptyContact)
    it('should return valid display_name', testGetSummaries)
    it('should not update empty forwarded attribute', testAddEmptyAttribute)
  })
})
