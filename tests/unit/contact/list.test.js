const { expect } = require('chai')
const uuid = require('uuid')

const { createContext, handleJobs } = require('../helper')

const AttributeDef = require('../../../lib/models/Contact/attribute_def')
const BrandList = require('../../../lib/models/Brand/list')
const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const List = require('../../../lib/models/Contact/list')
const ListMember = require('../../../lib/models/Contact/list_members')
const Orm = require('../../../lib/models/Orm')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

const { attributes } = require('./helper')
const { create } = require('./data/list.json')

let user, brand, def_ids_by_name, TAG

async function setup() {
  user = await User.getByEmail('test@rechat.com')

  if (!user) throw new Error('User not found!')

  brand = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    }
  })
  Context.set({ user, brand })
  await handleJobs()

  def_ids_by_name = await AttributeDef.getDefsByName(brand.id)
  TAG = def_ids_by_name.get('tag')
}

async function createContact(data) {
  const res = await Contact.create(
    data.map(c => ({ ...c, attributes: attributes(c.attributes), user: user.id })),
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
        attribute_def: TAG,
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
      filter_type: 'and'
    }
  })

  const list = await List.get(id)
  expect(list.filters).to.be.null

  await handleJobs()
}

async function testCreateList() {
  const list = await createWarmList()
  expect(list).not.to.be.undefined
  expect(list.filters).to.be.an('array')
  expect(list.filters).to.have.length(1)
  expect(list.filters[0]).to.include({
    attribute_def: TAG,
    value: 'Warm List',
    operator: 'eq',
    invert: false,
    type: 'contact_list_filter'
  })

  expect(list.args).to.be.eql({
    filter_type: 'and',
    q: null,
    crm_tasks: null,
    flows: null,
    type: 'contact_list_args'
  })

  return list
}

async function testHasAccess() {
  const list = await createWarmList()

  async function testAccess(op) {
    const accessIndex = await List.hasAccess(brand.id, op, [list.id])
    expect(accessIndex.get(list.id)).to.be.true
  }

  await testAccess('read')
  await testAccess('write')
}

function testGetNonExistentList(done) {
  List.get(uuid.v4()).then(
    () => {
      done(new Error('Fetching a non-existing list did not throw an error!'))
    },
    () => done()
  )
}

async function testUpdateList() {
  const list = await createWarmList()

  async function updateName() {
    await List.update(
      list.id,
      {
        ...list,
        name: 'Updated Warm List'
      },
      user.id
    )

    const updated = await List.get(list.id)
    expect(updated.name).to.be.equal('Updated Warm List')
  }

  async function updateFilterType() {
    await List.update(
      list.id,
      {
        ...list,
        args: { filter_type: 'or' }
      },
      user.id
    )

    const updated = await List.get(list.id)
    expect(updated.args.filter_type).to.be.equal('or')
  }

  await updateName()
  await updateFilterType()
}

async function testDeleteList() {
  const list = await createWarmList()

  const n = await List.delete([list.id], user.id)
  expect(n).to.be.equal(1)

  const lists = await List.getForBrand(brand.id)
  expect(lists).to.be.empty
}

async function testFormatListName() {
  expect(
    await List.formatCriteria({
      filters: [
        {
          attribute_def: TAG,
          value: 'Warm List'
        }
      ]
    })
  ).to.be.equal('(Tag = Warm List)')
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

/**
 * @param {string} id
 * @param {string[]} associations
 */
async function getContact(id, associations) {
  Orm.setEnabledAssociations(associations)
  const model = await Contact.get(id)
  const populated = await Orm.populate({
    models: [model],
    associations
  })

  return populated[0]
}

async function testUpdateListMembersAfterUpdatingContacts() {
  const list = await testCreateList()
  const contact_ids = await createContact([create[0]])

  const first_contact = await getContact(contact_ids[0], ['contact.attributes'])

  await Contact.update([{
    id: contact_ids[0],
    attributes: [{
      ...first_contact.attributes.find(a => a.attribute_type === 'tag'),
      text: 'Something Else'
    }]
  }], user.id, brand.id)

  await handleJobs()

  const members = await ListMember.findByListId(list.id)
  expect(members).to.be.empty

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.be.null
}

async function testUpdateListMembersAfterDeletingContacts() {
  const list = await testCreateList()
  const contact_ids = await createContact([create[0]])

  await Contact.delete(contact_ids, user.id)

  await handleJobs()

  const members = await ListMember.findByListId(list.id)
  expect(members).to.be.empty
}

async function testUpdateListMembersAfterChangingFilters() {
  Context.log('Create WarmList...'.grey)
  const list = await createWarmList()
  Context.log('Create 2 contacts...'.grey)
  const contact_ids = await createContact(create)

  Context.log('Update list filters...'.grey)
  await List.update(list.id, {
    ...list,
    filters: [...list.filters, {
      attribute_def: TAG,
      value: 'Agent'
    }]
  }, user.id)

  await handleJobs()

  const members = await ListMember.findByListId(list.id)
  expect(members).to.be.empty

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.be.null
}

async function testUpdateListMembersAfterDeletingList() {
  Context.log('Create WarmList...'.grey)
  const list = await createWarmList()
  Context.log('Create 2 contacts...'.grey)
  const contact_ids = await createContact(create)

  Context.log('Update list filters...'.grey)
  await List.delete([list.id], user.id)

  await handleJobs()

  const members = await ListMember.findByListId(list.id)
  expect(members).to.be.empty

  Orm.setEnabledAssociations(['contact.lists'])
  const contact = await Contact.get(contact_ids[0])
  expect(contact.lists).to.be.null
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

async function testGlobalBrandLists() {
  await BrandList.createAll(undefined, [
    {
      name: 'Warm List',
      touch_freq: 60,
      filters: [
        {
          attribute_def: TAG,
          value: 'Warm List'
        }
      ]
    }
  ])

  const lists = await BrandList.getForBrand(brand.id)

  expect(lists).to.have.length(1)
  expect(lists[0].name).to.be.equal('Warm List')
}

async function testBrandLists() {
  await BrandList.createAll(brand.id, [
    {
      name: 'Warm List',
      touch_freq: 60,
      filters: [
        {
          attribute_def: TAG,
          value: 'Warm List'
        }
      ]
    },
    {
      name: 'Hot List',
      touch_freq: 30,
      filters: [
        {
          attribute_def: TAG,
          value: 'Hot List'
        }
      ]
    }
  ])

  const b2 = await BrandHelper.create({
    roles: {
      Admin: [user.id]
    },
    parent: brand.id,
    contexts: [],
    checklists: []
  })

  await handleJobs()

  const lists = await List.getForBrand(b2.id)

  expect(lists).to.have.length(2)
  expect(lists[0].name).to.be.equal('Warm List')
  expect(lists[1].name).to.be.equal('Hot List')
}

function testBrandListNameValidation(done) {
  BrandList.createAll(brand.id, [
    {
      name: '',
      filters: []
    }
  ]).then(
    () => {
      done(new Error('Creating unnamed brand list did not throw an error!'))
    },
    () => done()
  )
}

function testBrandListTouchFreqValidation(done) {
  BrandList.createAll(brand.id, [
    {
      name: 'Test',
      filters: [],
      touch_freq: -10
    }
  ]).then(
    () => {
      done(
        new Error(
          'Creating brand list with negative touch frequency did not throw an error!'
        )
      )
    },
    () => done()
  )
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('List', () => {
    it('should allow creating a list', testCreateList)
    it('should allow creating an empty list', createEmptyList)
    it('should fetch lists for brand', testFetchListsForBrand)
    it('should allow updating a list', testUpdateList)
    it('should allow deleting a list', testDeleteList)
    it('should check access to list', testHasAccess)
    it('should throw when fetching a non-existent list', testGetNonExistentList)
    it('should format a list for Slack', testFormatListName)
  })

  describe('List Member', () => {
    it(
      'should initialize list members when list is created',
      testInitializeListMembers
    )
    it(
      'should update list members after contacts are created',
      testUpdateListMembersAfterAddingContacts
    )
    it(
      'should update list filters are updated',
      testUpdateListMembersAfterChangingFilters
    )

    it(
      'should update list members after contacts are updaed',
      testUpdateListMembersAfterUpdatingContacts
    )
    it(
      'should update list members after contacts are deleted',
      testUpdateListMembersAfterDeletingContacts
    )
    it(
      'should update list members when filters are updated',
      testUpdateListMembersAfterChangingFilters
    )
    it(
      'should update list members when a list is deleted',
      testUpdateListMembersAfterDeletingList
    )
  })

  describe('Brand List', () => {
    it('should allow global brand lists', testGlobalBrandLists)
    it(
      'should create lists based on brand list templates on brand creation',
      testBrandLists
    )
    it(
      'should not allow creating brand list without a name',
      testBrandListNameValidation
    )
    it(
      'should not allow creating brand list with a negative touch frequency',
      testBrandListTouchFreqValidation
    )
  })
})
