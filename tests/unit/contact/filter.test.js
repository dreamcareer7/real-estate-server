const { expect } = require('chai')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const { createContext, handleJobs } = require('../helper')
const contactsData = require('./data/filter.json')

const Contact = require('../../../lib/models/Contact')
const { fastFilter } = require('../../../lib/models/Contact/fast_filter')
const Context = require('../../../lib/models/Context')
const CrmTask = require('../../../lib/models/CRM/Task')
const User = require('../../../lib/models/User/get')

const BrandHelper = require('../brand/helper')
const { attributes } = require('./helper')
const sql = require('../../../lib/utils/sql')

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
}

async function createContact(data = contactsData) {
  contact_ids = await Contact.create(
    data.map(c => ({ ...c, user: user.id })),
    user.id,
    brand.id,
    'direct_request',
    { activity: false, get: false, relax: false }
  )

  await handleJobs()

  return contact_ids
}

async function testFFQuery(q, expected_length) {
  const filter_res = await Contact.fastFilter(brand.id, user.id, [], { q, order: 'display_name' })
  expect(filter_res.total).to.equal(expected_length)
  return filter_res
}
async function testFQuery(q, expected_length) {
  const filter_res = await Contact.filter(brand.id, user.id, [], { q, order: 'display_name' })
  expect(filter_res.total).to.equal(expected_length)
  return filter_res
}

async function testFilterByQuery() {
  await createContact()

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
  await createContact()

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

async function testCrmAssociationFilter() {
  await createContact()

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
    const filter_res = await Contact.fastFilter(brand.id, user.id, [], { crm_tasks, filter_type })
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
  await createContact()

  await testFFQuery(['+1', '(214)', '642-1552'], 0)
  await testFQuery(['+1', '(214)', '642-1552'], 0)
}

async function testMixedFilter() {
  await createContact()

  await (async function () {
    const filter_res = await fastFilter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag3'
    }, {
      attribute_type: 'city',
      value: 'Dallas'
    }], {})
    expect(filter_res.total).to.equal(1)
  })()

  await (async function () {
    const filter_res = await fastFilter(brand.id, user.id, [{
      attribute_type: 'tag',
      value: 'Tag3'
    }], {})
    expect(filter_res.total).to.equal(1)
  })()
}

function traverseFiltersDir() {
  const filter_dir = path.resolve(__dirname, 'filter')
  
  function traverse(current_dir) {
    const contents = fs.readdirSync(current_dir, { encoding: 'utf-8' })
    const sub_dirs = contents.filter(c => {
      const s = fs.statSync(path.resolve(current_dir, c))
      return s.isDirectory()
    })
    const test_cases = contents.filter(c => c.endsWith('.yaml'))

    for (const test_case of test_cases) {
      const test_case_file = path.resolve(current_dir, test_case)
      const contents = yaml.loadAll(fs.readFileSync(test_case_file, 'utf8'))

      for (const doc of contents) {
        describe(doc.description ?? test_case.replace('.yaml', ''), function() {
          for (const c of doc.tests) {
            let batch = c.batch
            if (!batch) {
              batch = [{
                filter: c.filter,
                expected: c.expected
              }]
            }
            it(c.description, testContactFilter(
              c.contacts,
              batch
            ))
          }
        })
      }
    }

    for (const sub_dir of sub_dirs) {
      describe(sub_dir, function() {
        traverse(path.resolve(current_dir, sub_dir))
      })
    }
  }

  traverse(filter_dir)
}

/**
 * @param {object} contacts 
 * @param {{ filter: IContactFilterOptions & { attributes: IContactAttributeFilter[] }; expected: number[] }[]} batch
 */
function testContactFilter(contacts, batch) {
  return async function() {
    const users = await sql.select('SELECT id, email FROM users WHERE deleted_at IS NULL')
    const users_by_email = users.reduce((dic, u) => {
      dic[u.email] = u.id
      return dic
    }, {})
    const ids = await Contact.create(
      contacts.map(({ user, assignees, ...c }) => ({
        attributes: attributes(c),
        user: users_by_email[user],
      })),
      user.id,
      brand.id,
      'direct_request',
      { activity: false, get: false, relax: false }
    )
  
    await handleJobs()
    
    for (let i = 0; i < batch.length; i++) {
      const { filter, expected } = batch[i]
      const { ids: found } = await Contact.fastFilter(brand.id, user.id, filter.attributes, filter)
  
      expect(found.map(id => ids.indexOf(id)), `Expectation ${i}`).to.have.members(expected)
    }
  }
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', traverseFiltersDir)

  describe('Filter - Additional', () => {
    it('should filter by task association', testCrmAssociationFilter)
    it('should filter by both global and custom attributes', testMixedFilter)
  })

  describe('Full-Text Search', () => {
    it('should full-text search', testFilterByQuery)
    it('should fts-filter even if terms contain empty string', testFTSWithEmptyString)
    it('should escape special characters', testFTSEscape)
  })
})
