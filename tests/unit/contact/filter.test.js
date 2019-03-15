const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')

const BrandHelper = require('../brand/helper')

let user, brand

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
  await Contact.create(
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
      },
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Emil'
          },
          {
            attribute_type: 'email',
            text: 'emil@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag2'
          }
        ]
      },
      {
        user: user.id,
        attributes: [
          {
            attribute_type: 'first_name',
            text: 'Nasser'
          },
          {
            attribute_type: 'email',
            text: 'naser@rechat.com'
          },
          {
            attribute_type: 'tag',
            text: 'Tag3'
          }
        ]
      }
    ],
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

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Filter', () => {
    it('should filter by has a tag', testFilterTagEquals)
    it('should filter by has any of tags', testFilterTagAny)
    it('should filter by has all tags', testFilterTagAll)
    it('should filter by first name is', testFilterFirstNameEquals)
    it('should filter by first letter of sort field', testAlphabeticalFilter)
  })
})
