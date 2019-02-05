const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const List = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list_members')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')
const { create } = require('./data/list.json')

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

async function testCreateList() {
  const id = await List.create(user.id, brand.id, {
    name: 'Warm List',
    filters: [{
      attribute_type: 'tag',
      value: 'Warm List'
    }],
    is_pinned: true,
    touch_freq: 30
  })

  await handleJobs()

  const list = await List.get(id)

  expect(list).not.to.be.undefined

  return list
}

async function testFetchListsForBrand() {
  await testCreateList()
  const lists = await List.getForBrand(brand.id, [user.id])

  expect(lists).to.have.length(1)
}

async function testUpdateListMembersAfterAddingContacts() {
  const list = await testCreateList()
  const contact_ids = await createContact(create)

  const members = await ListMember.findByListId(list.id)
  expect(members).to.have.length(1)
  expect(members[0].contact).to.be.equal(contact_ids[0])

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.have.length(1)
}

async function testInitializeListMembers() {
  const contact_ids = await createContact(create)
  const list = await testCreateList()

  const members = await ListMember.findByListId(list.id)
  expect(members).to.have.length(1)
  expect(members[0].contact).to.be.equal(contact_ids[0])

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.have.length(1)
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('List', () => {
    it('should allow creating a list', testCreateList)
    it('should fetch lists for brand', testFetchListsForBrand)
    it('should initialize list members when list is created', testInitializeListMembers)
    it('should update list members after contacts are created', testUpdateListMembersAfterAddingContacts)
  })
})
