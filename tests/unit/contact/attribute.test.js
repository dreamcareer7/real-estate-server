const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const AttributeDef = require('../../../lib/models/Contact/attribute_def')
const ContactAttribute = require('../../../lib/models/Contact/attribute')
const Context = require('../../../lib/models/Context')
const Metric = require('../../../lib/models/Metric')
const User = require('../../../lib/models/User')

const sql = require('../../../lib/utils/sql')

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

  expect(Metric.get('query:contact/attribute/clear_primaries')).to.be.equal(2)

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

  expect(Metric.get('query:contact/attribute/clear_primaries')).to.be.equal(2)

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

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Attribute', () => {
    it('should not clear new is_primary flags on insert', testDoesntClearIsPrimaryOnNewAttrsAfterInsert)
    it('should clear old is_primary flags on insert', testClearIsPrimaryOnInsert)
    it('should clear old is_primary flags on update', testClearIsPrimaryOnUpdate)
  })
})
