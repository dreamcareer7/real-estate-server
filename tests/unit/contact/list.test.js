const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const AttributeDef = require('../../../lib/models/Contact/attribute_def')
const List = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list_members')
const Context = require('../../../lib/models/Context')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')
const { create } = require('./data/list.json')

let user, brand, def_ids_by_name

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ user, brand })

  def_ids_by_name = await AttributeDef.getDefsByName(brand.id)
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

async function createWarmList() {
  const id = await List.create(user.id, brand.id, {
    name: 'Warm List',
    filters: [
      {
        attribute_def: def_ids_by_name.get('tag'),
        value: 'Warm List'
      }
    ],
    is_editable: true,
    touch_freq: 30
  })

  await handleJobs()

  return List.get(id)
}

async function createEmptyList() {
  const id = await List.create(user.id, brand.id, {
    name: 'tag',
    filters: [],
    args: {
      users: [],
      filter_type: 'and'
    }
  })

  const list = await List.get(id)
  console.log(list)
  expect(list.filters).to.be.null

  await handleJobs()
}

async function testCreateList() {
  const list = await createWarmList()
  expect(list).not.to.be.undefined
  expect(list.filters).to.be.an('array')
  expect(list.filters).to.have.length(1)
  expect(list.filters[0]).to.include({
    attribute_def: def_ids_by_name.get('tag'),
    value: 'Warm List',
    operator: 'eq',
    invert: false,
    type: 'contact_list_filter'
  })

  expect(list.args).to.be.eql({
    filter_type: 'and',
    query: null,
    type: 'contact_list_args'
  })

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
    it('should allow creating an empty list', createEmptyList)
    it('should fetch lists for brand', testFetchListsForBrand)
    it(
      'should initialize list members when list is created',
      testInitializeListMembers
    )
    it(
      'should update list members after contacts are created',
      testUpdateListMembersAfterAddingContacts
    )
  })
})
