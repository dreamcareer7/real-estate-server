const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const ContactDuplicate = require('../../../lib/models/Contact/duplicate')
const Context = require('../../../lib/models/Context')
const Job = require('../../../lib/models/Job')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')
const { same_email, same_phone } = require('./data/merge.json')

let user, brand

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ user, brand })
}

async function createContact(data) {
  const res = await Contact.create(
    data.map(c => ({ ...c, user: user.id })),
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return res
}

async function testMarkDuplicateSameEmail() {
  const ids = await createContact(same_email)

  const clusters = await ContactDuplicate.findForBrand(brand.id, { start: 0, limit: 10 })
  expect(clusters).to.have.length(1)
  expect(clusters[0].contacts).to.have.members(ids)
}

async function testMarkDuplicateSamePhone() {
  const ids = await createContact(same_phone)

  const clusters = await ContactDuplicate.findForBrand(brand.id, { start: 0, limit: 10 })
  expect(clusters).to.have.length(1)
  expect(clusters[0].contacts).to.have.members(ids)
}

async function testFindDuplicatesForBothContacts() {
  const ids = await createContact(same_phone)

  let cluster

  cluster = await ContactDuplicate.findForContact(brand.id, ids[0])
  expect(cluster).not.to.be.undefined
  expect(cluster.contacts).to.have.members(ids)

  cluster = await ContactDuplicate.findForContact(brand.id, ids[1])
  expect(cluster).not.to.be.undefined
  expect(cluster.contacts).to.have.members(ids)
}

async function testUpdateDuplicateEdges() {
  const ids = await createContact(same_phone)
  let clusters

  clusters = await ContactDuplicate.findForBrand(brand.id, {})
  expect(clusters).to.have.length(1)

  Orm.setEnabledAssociations(['contact.attributes'])
  const model = await Contact.get(ids[0])
  const populated = await Orm.populate({
    models: [model],
    associations: ['contact.attributes']
  })
  const contactA = populated[0]

  await Contact.update(user.id, brand.id, [{
    id: ids[0],
    attributes: [{
      id: contactA.attributes.find(a => a.attribute_type === 'phone_number').id,
      text: '(703) 726-1600'
    }]
  }])

  await handleJobs()

  clusters = await ContactDuplicate.findForBrand(brand.id, {})
  expect(clusters).to.be.empty

  const cluster = await ContactDuplicate.findForContact(brand.id, ids[0])
  expect(cluster).to.be.undefined
}

async function testRemoveDuplicateEdges() {
  const ids = await createContact(same_phone)
  let clusters

  clusters = await ContactDuplicate.findForBrand(brand.id, {})
  expect(clusters).to.have.length(1)

  await Contact.delete([ids[1]], user.id)
  await handleJobs()

  clusters = await ContactDuplicate.findForBrand(brand.id, {})
  expect(clusters).to.be.empty

  const cluster = await ContactDuplicate.findForContact(brand.id, ids[0])
  expect(cluster).to.be.undefined
}

async function testMergeWithSameEmails() {
  const ids = await createContact(same_email)

  Context.get('jobs').push(
    Job.queue.create('contact_duplicates', {
      clusters: [
        {
          parent: ids[0],
          sub_contacts: [ids[1]]
        }
      ],
      user_id: user.id,
      brand_id: brand.id,
      type: 'merge'
    })
  )

  await handleJobs()

  Orm.setEnabledAssociations(['contact.attributes'])

  const contacts = await Contact.getForBrand(brand.id, [], {})
  expect(contacts).to.have.length(1)

  const populated = await Orm.populate({
    models: contacts,
    associations: ['contact.attributes']
  })

  const attrs = populated[0].attributes.filter(
    a => a.attribute_type === 'first_name'
  )

  expect(attrs).to.have.length(1)
  expect(attrs[0].text).to.be.equal('Abbas')
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Duplicates', () => {
    it('should mark contacts with same email as duplicate', testMarkDuplicateSameEmail)
    it('should mark contacts with same phone as duplicate', testMarkDuplicateSamePhone)
    it('should find duplicate cluster for any of contacts', testFindDuplicatesForBothContacts)
    it('should dissolve the duplicate cluster after credential update', testUpdateDuplicateEdges)
    it('should dissolve the duplicate cluster after contact delete', testRemoveDuplicateEdges)
  })

  describe('Merge', () => {
    it(
      'should remove duplicate emails from the merged contact',
      testMergeWithSameEmails
    )
  })
})
