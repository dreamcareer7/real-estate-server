const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const ContactAttribute = require('../../../lib/models/Contact/attribute/manipulate')
const Context = require('../../../lib/models/Context')
const Orm = {
  ...require('../../../lib/models/Orm/index'),
  ...require('../../../lib/models/Orm/context'),
}
const User = require('../../../lib/models/User/get')

const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const { attributes } = require('./helper')

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

  const summaries = await Contact.getAll([contact.id])

  expect(summaries[0].email).to.be.null
}

async function testAddAttribute() {
  await Contact.addAttributes(
    contact.id,
    [
      {
        attribute_type: 'phone_number',
        text: '+989123456789',
        is_primary: true,
        is_partner: false
      }
    ],
    user.id,
    brand.id
  )
  await handleJobs()

  const updated = await Contact.get(contact.id)

  expect(updated.phone_number).to.be.equal('+989123456789')
}

async function testCompanyContact() {
  const [id] = await Contact.create(
    [
      {
        attributes: [
          {
            attribute_type: 'company',
            text: 'ACME Corp'
          }
        ],
        user: user.id
      }
    ],
    user.id,
    brand.id
  )

  await handleJobs()

  const contact = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(contact.search_field).to.be.equal('\'acme\':1C \'corp\':2C')

  const summary = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(summary.search_field).to.be.equal('\'acme\':1C \'corp\':2C')
}

async function testEmptyContact() {
  const [id] = await Contact.create(
    [
      {
        attributes: [
          {
            attribute_type: 'birthday',
            date: Date.now() / 1000
          }
        ],
        user: user.id
      }
    ],
    user.id,
    brand.id
  )

  await handleJobs()

  const contact = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(contact.search_field).to.be.equal('\'guest\':1')

  const summary = await sql.selectOne('SELECT * FROM contacts WHERE id = $1', [id])
  expect(summary.search_field).to.be.equal('\'guest\':1')
}

async function testMarketingName() {
  const attrs = {
    first_name: 'John',
    last_name: 'Doe',
    marketing_name: 'John and Jane Doe'
  }

  const [id] = await Contact.create(
    [
      {
        attributes: attributes(attrs),
        user: user.id
      }
    ],
    user.id,
    brand.id
  )

  await handleJobs()

  const created = await Contact.get(id)

  expect(created).to.include({
    ...attrs,
    partner_name: null
  })
}

async function testGetSummaries() {
  const ids = await Contact.create(
    [
      {
        user: user.id,
        attributes: attributes({
          first_name: 'Abbas',
          company: 'my_company',
          email: ['abbas@rechat.com']
        })
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

  contact = await Contact.get(my_contact.id)
  expect(contact.display_name).to.be.equal('Abbas')

  // delete first_name attribute
  const first_name_attr = my_contact.attributes.find(a => a.attribute_type === 'first_name')
  await ContactAttribute.delete([first_name_attr.id], user.id)
  await handleJobs()
  contact = await Contact.get(my_contact.id)

  expect(contact).to.include({
    first_name: null,
    display_name: 'my_company'
  })

  // delete email attribute
  const email_attr = my_contact.attributes.find(a => a.attribute_type === 'email')
  await ContactAttribute.delete([email_attr.id], user.id)
  await handleJobs()
  contact = await Contact.get(my_contact.id)

  expect(contact).to.include({
    first_name: null,
    email: null,
    display_name: 'my_company'
  })

  // delete company attribute
  const company_attr = my_contact.attributes.find(a => a.attribute_type === 'company')
  await ContactAttribute.delete([company_attr.id], user.id)
  await handleJobs()
  contact = await Contact.get(my_contact.id)

  expect(contact).to.include({
    first_name: null,
    email: null,
    display_name: 'Guest'
  })
}

async function testAddEmptyAttribute() {
  const old_summaries = await Contact.getAll([contact.id])
  const old_middle_name = old_summaries[0].middle_name

  await Contact.addAttributes(
    contact.id,
    [
      {
        attribute_type: 'middle_name',
        text: '    ',
        is_primary: true,
        is_partner: false
      }
    ],
    user.id,
    brand.id
  )
  await handleJobs()

  const new_summaries = await Contact.getAll([contact.id])
  const new_middle_name = new_summaries[0].middle_name

  expect(old_middle_name).to.be.equal(new_middle_name)
}

async function testPartner() {
  const [id] = await Contact.create([{
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      spouse_first_name: 'Jane',
      spouse_last_name: 'Doe',
      spouse_email: ['jane@doe.com']
    }),
    user: user.id
  }], user.id, brand.id)

  await handleJobs()

  const created = await Contact.get(id)

  expect(created.partner_first_name).to.be.equal('Jane')
  expect(created.partner_last_name).to.be.equal('Doe')
  expect(created.partner_email).to.be.equal('jane@doe.com')
}

async function testAddressSummary() {
  const [id] = await Contact.create(
    [
      {
        attributes: attributes({
          first_name: 'John',
          last_name: 'Doe',
          city: [
            {
              label: 'Home',
              index: 1,
              text: 'Dallas'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Grapevine',
              is_primary: true
            }
          ],
          street_number: [
            {
              label: 'Home',
              index: 1,
              text: '1200'
            },
            {
              label: 'Work',
              index: 2,
              text: '3535',
              is_primary: true
            }
          ],
          street_name: [
            {
              label: 'Home',
              index: 1,
              text: 'Main'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Bluffs',
              is_primary: true
            }
          ],
          street_suffix: [
            {
              label: 'Home',
              index: 1,
              text: 'Street'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Ln',
              is_primary: true
            }
          ],
          unit_number: [
            {
              label: 'Work',
              index: 2,
              text: '#101',
              is_primary: true
            }
          ],
          state: [
            {
              label: 'Work',
              index: 2,
              text: 'Texas',
              is_primary: true
            }
          ],
          postal_code: [
            {
              label: 'Work',
              index: 2,
              text: '76051',
              is_primary: true
            }
          ]
        }),
        user: user.id
      }
    ],
    user.id,
    brand.id
  )

  await handleJobs()

  const created = await Contact.get(id)

  if (!Array.isArray(created.address)) throw new Error('No addresses found on contact!')

  expect(created.address).to.have.length(2)

  created.address.sort((a, b) => (a.city > b.city) ? 1 : -1)
  expect(created.address[0]).to.be.eql({
    house_num: '1200',
    name: 'Main',
    suftype: 'Street',
    city: 'Dallas',
    line1: '1200 Main St',
    line2: 'Dallas',
    full: '1200 Main St, Dallas',
    extra: 'Home',
    type: 'stdaddr'
  })

  expect(created.address[1]).to.be.eql({
    house_num: '3535',
    name: 'Bluffs',
    suftype: 'Ln',
    city: 'Grapevine',
    state: 'Texas',
    unit: '#101',
    postcode: '76051',
    line1: '3535 Bluffs Ln #101',
    line2: 'Grapevine Texas 76051',
    full: '3535 Bluffs Ln #101, Grapevine Texas 76051',
    extra: 'Work',
    type: 'stdaddr'
  })
}

async function testAddressSummaryWithoutPrimary() {
  const [id] = await Contact.create(
    [
      {
        attributes: attributes({
          first_name: 'John',
          last_name: 'Doe',
          city: [
            {
              label: 'Home',
              index: 1,
              text: 'Dallas'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Grapevine'
            }
          ],
          street_number: [
            {
              label: 'Home',
              index: 1,
              text: '1200'
            },
            {
              label: 'Work',
              index: 2,
              text: '3535'
            }
          ],
          street_name: [
            {
              label: 'Home',
              index: 1,
              text: 'Main'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Bluffs'
            }
          ],
          street_suffix: [
            {
              label: 'Home',
              index: 1,
              text: 'Street'
            },
            {
              label: 'Work',
              index: 2,
              text: 'Ln'
            }
          ],
          unit_number: [
            {
              label: 'Work',
              index: 2,
              text: '#101'
            }
          ],
          state: [
            {
              label: 'Work',
              index: 2,
              text: 'Texas'
            }
          ],
          postal_code: [
            {
              label: 'Work',
              index: 2,
              text: '76051'
            }
          ]
        }),
        user: user.id
      }
    ],
    user.id,
    brand.id
  )

  await handleJobs()

  const created = await Contact.get(id)

  if (!Array.isArray(created.address)) throw new Error('No addresses found on contact!')

  expect(created.address).to.have.length(2)

  expect(created.address[0]).to.be.eql({
    house_num: '1200',
    name: 'Main',
    suftype: 'Street',
    city: 'Dallas',
    line1: '1200 Main St',
    line2: 'Dallas',
    full: '1200 Main St, Dallas',
    extra: 'Home',
    type: 'stdaddr'
  })

  expect(created.address[1]).to.be.eql({
    house_num: '3535',
    name: 'Bluffs',
    suftype: 'Ln',
    city: 'Grapevine',
    state: 'Texas',
    unit: '#101',
    postcode: '76051',
    line1: '3535 Bluffs Ln #101',
    line2: 'Grapevine Texas 76051',
    full: '3535 Bluffs Ln #101, Grapevine Texas 76051',
    extra: 'Work',
    type: 'stdaddr'
  })
}

async function updateParkedProperty() {
  const ids = await Contact.create(
    [{
      user: user.id,
      attributes: [
        { attribute_type: 'first_name', text: 'parked_contactd' },
        { attribute_type: 'tag', text: 'Tag1' }
      ],
      parked: true
    }],
    user.id,
    brand.id,
    'google_integration',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  const contact = await Contact.get(ids[0])
  expect(contact.parked).to.be.equal(true)

  const attributes = [{ attribute_type: 'email', text: 'abbas@rechat.com' }]
  const updatedContacts = [{ id: contact.id, attributes, parked: false }]

  await Contact.update(updatedContacts, user.id, brand.id, 'google_integration')

  const updated = await Contact.get(contact.id)
  expect(updated.parked).to.be.equal(false)
}


describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Summary', () => {
    it('should update summary after deleting an attribute', testDeleteAttribute)
    it('should update summary after adding an attribute', testAddAttribute)
    it('should update search field for company contacts', testCompanyContact)
    it('should update search field for an empty contact', testEmptyContact)
    it('should return valid marketing_name', testMarketingName)
    it('should return valid display_name', testGetSummaries)
    it('should not update empty forwarded attribute', testAddEmptyAttribute)
    it('should calculate partner summary fields', testPartner)
    it('should create stdaddr array for address summaries', testAddressSummary)
    it('should create stdaddr array for address summaries without primary', testAddressSummaryWithoutPrimary)
    it('should update the parked property of a created contact', updateParkedProperty)
  })
})
