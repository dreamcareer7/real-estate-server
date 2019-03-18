const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const contactsData = require('./data/filter.json')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

let user, brand, contact_ids

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
  contact_ids = await Contact.create(
    contactsData.map(c => ({ ...c, user: user.id })),
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

async function testFilterTagEquals() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'tag',
    value: 'Tag1'
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testFilterTagAny() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'tag',
    operator: 'any',
    value: ['Tag1']
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testFilterTagAll() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'tag',
    operator: 'all',
    value: ['Tag1', 'Tag2']
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testFilterFirstNameEquals() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'first_name',
    value: 'Abbas'
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testAlphabeticalFilter() {
  async function testFastFilter(alphabet, expected_length) {
    const filter_res = await Contact.fastFilter(brand.id, [], { alphabet })
    expect(filter_res.total).to.equal(expected_length)
  }
  async function testFilter(alphabet, expected_length) {
    const filter_res = await Contact.filter(brand.id, [], { alphabet })
    expect(filter_res.total).to.equal(expected_length)
  }

  await testFastFilter('a', 1)
  await testFastFilter('A', 1)
  await testFastFilter('b', 0)

  await testFilter('a', 1)
  await testFilter('A', 1)
  await testFilter('b', 0)

  await testFastFilter('ab', 1)
  await testFastFilter('ab%', 0)

  await testFilter('ab', 1)
  await testFilter('ab%', 0)
}

async function testCrmAssociationFilter() {
  /** @type {ITaskInput[]} */
  const tasks = [{
    title: 'Task A',
    status: 'PENDING',
    due_date: Date.now() / 1000,
    brand: brand.id,
    created_by: user.id,
    task_type: 'Email',
    associations: [{
      association_type: 'contact',
      contact: contact_ids[0]
    }]
  }, {
    title: 'Task B',
    status: 'PENDING',
    due_date: Date.now() / 1000,
    brand: brand.id,
    created_by: user.id,
    task_type: 'Email',
    associations: [{
      association_type: 'contact',
      contact: contact_ids[1]
    }]
  }]

  const task_ids = await CrmTask.createMany(tasks)

  /**
   * @param {UUID[]} crm_task 
   * @param {'and' | 'or'} filter_type 
   * @param {number} expected_length 
   */
  async function testFastFilter(crm_task, expected_length, filter_type = 'and') {
    const filter_res = await Contact.fastFilter(brand.id, [], { crm_task, filter_type })
    expect(filter_res.total).to.equal(expected_length)
  }

  /**
   * @param {UUID[]} crm_task 
   * @param {'and' | 'or'} filter_type 
   * @param {number} expected_length 
   */
  async function testFilter(crm_task, expected_length, filter_type = 'and') {
    const filter_res = await Contact.filter(brand.id, [], { crm_task, filter_type })
    expect(filter_res.total).to.equal(expected_length)
  }

  // AND mode
  await testFastFilter([task_ids[0]], 1, 'and')
  await testFastFilter([task_ids[1]], 1, 'and')
  await testFastFilter(task_ids, 0, 'and')

  await testFilter([task_ids[0]], 1, 'and')
  await testFilter([task_ids[1]], 1, 'and')
  await testFilter(task_ids, 0, 'and')

  // OR mode
  await testFastFilter([task_ids[0]], 1, 'or')
  await testFastFilter([task_ids[1]], 1, 'or')
  await testFastFilter(task_ids, 2, 'or')

  await testFilter([task_ids[0]], 1, 'or')
  await testFilter([task_ids[1]], 1, 'or')
  await testFilter(task_ids, 2, 'or')
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', () => {
    it('should filter by has a tag', testFilterTagEquals)
    it('should filter by has any of tags', testFilterTagAny)
    it('should filter by has all tags', testFilterTagAll)
    it('should filter by first name is', testFilterFirstNameEquals)
    it('should filter by first letter of sort field', testAlphabeticalFilter)
    it('should filter by task association', testCrmAssociationFilter)
  })
})
