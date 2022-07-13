const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const contactsData = require('./data/filter.json')

const Contact = require('../../../lib/models/Contact')
const { fastFilter: mixedFilter, contactFilterQuery } = require('../../../lib/models/Contact/filter2')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const User = require('../../../lib/models/User/get')

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
    'direct_request',
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

async function testFilterNoTags() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'tag',
    value: null
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

async function testFilterTagCaseInsensitive() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'tag',
    operator: 'all',
    value: ['tag1', 'tag2']
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testFilterFirstNameEquals() {
  const filter_res = await Contact.fastFilter(brand.id, [{
    attribute_type: 'first_name',
    value: 'John'
  }], {})

  expect(filter_res.total).to.equal(1)
}

async function testFFQuery(q, expected_length) {
  const filter_res = await Contact.fastFilter(brand.id, [], { q, order: 'display_name' })
  expect(filter_res.total).to.equal(expected_length)
  return filter_res
}
async function testFQuery(q, expected_length) {
  const filter_res = await Contact.filter(brand.id, user.id, [], { q, order: 'display_name' })
  expect(filter_res.total).to.equal(expected_length)
  return filter_res
}

async function testFilterByGuest() {
  await Contact.create([
    {
      attributes: [
        {
          attribute_type: 'birthday',
          date: Date.now() / 1000
        }
      ],
      user: user.id
    }
  ], user.id, brand.id)

  await handleJobs()

  await testFFQuery(['Guest'], 1)
  await testFQuery(['Guest'], 1)
}

async function testFilterByQuery() {
  async function testFastFilter() {
    const { ids } = await testFFQuery(['Emil'], 2)
    const contacts = await Contact.getAll(ids, user.id)

    expect(contacts[0].display_name).to.be.equal('Emil Sedgh')
    expect(contacts[1].display_name).to.be.equal('Thomas and Emily')
  }
  async function testFilter() {
    const { ids } = await testFQuery(['Emil'], 2)
    const contacts = await Contact.getAll(ids, user.id)

    expect(contacts[0].display_name).to.be.equal('Emil Sedgh')
    expect(contacts[1].display_name).to.be.equal('Thomas and Emily')
  }

  await testFastFilter()
  await testFilter()
}

async function testFTSWithEmptyString() {
  async function testFastFilter() {
    const { ids } = await testFFQuery(['Emil', ''], 2)
    const contacts = await Contact.getAll(ids, user.id)

    expect(contacts[0].display_name).to.be.equal('Emil Sedgh')
    expect(contacts[1].display_name).to.be.equal('Thomas and Emily')
  }
  async function testFilter() {
    const { ids } = await testFQuery(['Emil', ''], 2)
    const contacts = await Contact.getAll(ids, user.id)

    expect(contacts[0].display_name).to.be.equal('Emil Sedgh')
    expect(contacts[1].display_name).to.be.equal('Thomas and Emily')
  }

  await testFastFilter()
  await testFilter()
}

async function testAlphabeticalFilter() {
  async function testFastFilter(alphabet, expected_length) {
    const filter_res = await Contact.fastFilter(brand.id, [], { alphabet })
    expect(filter_res.total).to.equal(expected_length)
  }
  async function testFilter(alphabet, expected_length) {
    const filter_res = await Contact.filter(brand.id, user.id, [], { alphabet })
    expect(filter_res.total).to.equal(expected_length)
  }

  await testFastFilter('j', 1)
  await testFastFilter('J', 1)
  await testFastFilter('g', 0)

  await testFilter('j', 1)
  await testFilter('J', 1)
  await testFilter('g', 0)

  await testFastFilter('jo', 1)
  await testFastFilter('jo%', 0)

  await testFilter('jo', 1)
  await testFilter('jo%', 0)
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
   * @param {UUID[]} crm_tasks 
   * @param {'and' | 'or'} filter_type 
   * @param {number} expected_length 
   */
  async function testFastFilter(crm_tasks, expected_length, filter_type = 'and') {
    const filter_res = await Contact.fastFilter(brand.id, [], { crm_tasks, filter_type })
    expect(filter_res.total).to.equal(expected_length)
  }

  /**
   * @param {UUID[]} crm_tasks 
   * @param {'and' | 'or'} filter_type 
   * @param {number} expected_length 
   */
  async function testFilter(crm_tasks, expected_length, filter_type = 'and') {
    const filter_res = await Contact.filter(brand.id, user.id, [], { crm_tasks, filter_type })
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

async function testFTSEscape() {
  await testFFQuery(['+1', '(214)', '642-1552'], 0)
  await testFQuery(['+1', '(214)', '642-1552'], 0)
}

async function testMixedFilter() {
  await (async function () {
    const filter_res = await mixedFilter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag3'
    }, {
      attribute_type: 'city',
      value: 'Dallas'
    }], {})
    expect(filter_res.total).to.equal(1)
  })()

  await (async function () {
    const filter_res = await mixedFilter(brand.id, [{
      attribute_type: 'tag',
      value: 'Tag3'
    }], {})
    expect(filter_res.total).to.equal(1)
  })()
}

async function testFilterQuery() {
  const q = await contactFilterQuery(
    brand.id,
    [
      {
        attribute_type: 'birthday',
        operator: 'eq',
        value: null,
        invert: true,
      },
    ],
    {}
  )

  console.log(q.toParam())
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', () => {
    it('should filter by has a tag', testFilterTagEquals)
    it('should filter by has no tags', testFilterNoTags)
    it('should filter by has any of tags', testFilterTagAny)
    it('should filter by has all tags', testFilterTagAll)
    it('should not be case-sensitive in filtering by tags', testFilterTagCaseInsensitive)
    it('should filter by first name is', testFilterFirstNameEquals)
    it('should filter by first letter of sort field', testAlphabeticalFilter)
    it('should filter by task association', testCrmAssociationFilter)
    it('should filter by both global and custom attributes', testMixedFilter)
  })

  describe('Full-Text Search', () => {
    it('should full-text search', testFilterByQuery)
    it('should filter by Guest', testFilterByGuest)
    it('should fts-filter even if terms contain empty string', testFTSWithEmptyString)
    it('should escape special characters', testFTSEscape)
  })

  describe('Query generator', () => {
    it('should log the query', testFilterQuery)
  })
})
