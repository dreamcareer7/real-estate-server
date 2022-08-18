const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect

const { createContext, handleJobs } = require('../helper')

const Contact = {
  ...require('../../../lib/models/Contact/get'),
  ...require('../../../lib/models/Contact/manipulate'),
}
const AttributeDef = require('../../../lib/models/Contact/attribute_def/get')
const ContactAttribute = require('../../../lib/models/Contact/attribute/get')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User/get')


const BrandHelper = require('../brand/helper')
const { attributes } = require('./helper')
const { create } = require('./data/attribute.json')

let user, brand, defs

/**
 * @param {any[]} data 
 */
async function createContact(data) {
  const res = await Contact.create(
    data.map(c => ({ ...c, attributes: attributes(c.attributes), user: user.id })),
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
      Admin: [user.id]
    },
    checklists: [],
    contexts: []
  })
  await handleJobs()

  Context.set({ user, brand })

  defs = await AttributeDef.getDefsByName(brand.id)
}

async function testDoesntClearIsPrimaryOnNewAttrsAfterInsert() {
  const [id] = await createContact([create[0]])
  const attrs = await ContactAttribute.getForContacts([id], [
    defs.get('email')
  ])

  expect(attrs.map(a => a.is_primary)).to.have.members([true])
}

async function testClearIsPrimaryOnInsert() {
  const [id] = await createContact([create[0]])

  await Contact.update([{
    id: id,
    attributes: attributes({
      phone_number: {
        text: '+989123456789',
        is_primary: true
      }
    })
  }], user.id, brand.id)

  const attrs = await ContactAttribute.getForContacts([id], [
    defs.get('email'),
    defs.get('phone_number'),
  ])

  expect(attrs.map(a => a.is_primary)).to.have.members([true, true])
}

async function testClearIsPrimaryOnUpdate() {
  const [id] = await createContact([create[1]])

  const attrs = await ContactAttribute.getForContacts([id], [
    defs.get('email'),
    defs.get('phone_number'),
  ])

  await Contact.update([{
    id: id,
    attributes: attributes({
      phone_number: {
        ...attrs.find(a => a.attribute_type === 'phone_number' && a.is_primary === false),
        is_primary: true
      }
    })
  }], user.id, brand.id)

  const new_attrs = await ContactAttribute.getForContacts([id], [
    defs.get('email'),
    defs.get('phone_number'),
  ])

  expect([{
    attribute_type: 'email',
    text: 'abbas@rechat.com',
    label: 'Personal',
    is_primary: true
  }, {
    attribute_type: 'phone_number',
    text: '+15021863625',
    label: 'Home',
    is_primary: true
  }, {
    attribute_type: 'phone_number',
    text: '+15552541900',
    label: 'Mobile',
    is_primary: false
  }].map(a => _.find(new_attrs, a)).every(a => a)).to.be.true
}

async function testAddressAttributes() {
  const [ id ] = await createContact([{
    attributes: {
      first_name: 'John',
      last_name: 'Doe',
      city: [{ text: 'Atlanta', index: 0 }],
      state: [{ text: 'GA', index: 0 }]
    }
  }])

  const contact = await Contact.get(id)
  expect(contact.address[0].state).to.be.equal('GA')
}

async function testPatchingDoubleTags() {
  const [id] = await createContact([create[2]])

  await Contact.updateTags([id], [], user.id, brand.id, true)
  const contact = await Contact.get(id)

  expect(contact.tags, 'Expected both TagT tags to have been removed').to.be.null
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Attribute', () => {
    it('should not clear new is_primary flags on insert', testDoesntClearIsPrimaryOnNewAttrsAfterInsert)
    it('should clear old is_primary flags on insert', testClearIsPrimaryOnInsert)
    it('should clear old is_primary flags on update', testClearIsPrimaryOnUpdate)
    it('should delete tags even if there are double tags', testPatchingDoubleTags)
    it('should summarize contact addresses into a stdaddr field', testAddressAttributes)
  })
})
