const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')
const {
  ContactJointExportQueryBuilder,
  ContactExportQueryBuilder
} = require('../../../lib/models/Analytics/OLAP')

const BrandHelper = require('../brand/helper')

const contacts = require('./data/contacts.json')

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
    contacts.map(c => ({ ...c, user: user.id })),
    user.id,
    brand.id,
    { activity: false, get: false, relax: false }
  )

  await handleJobs()
}

async function testExportJoint() {
  const queryBuilder = new ContactJointExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(3)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

async function testExportJointWithExclusion() {
  const queryBuilder = new ContactJointExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({
    excludes: [contact_ids[0]]
  })
  expect(facts).to.have.length(2)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

async function testExportJointWithFilter() {
  const queryBuilder = new ContactJointExportQueryBuilder(
    null,
    [
      {
        attribute_type: 'tag',
        value: ['friends'],
        operator: 'any'
      }
    ],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(2)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

async function testNormalExport() {
  const queryBuilder = new ContactExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(4)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

async function testNormalExportWithExclusion() {
  const queryBuilder = new ContactExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({
    excludes: [contact_ids[0]]
  })
  expect(facts).to.have.length(2)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

async function testNormalExportWithFilter() {
  const queryBuilder = new ContactExportQueryBuilder(
    null,
    [
      {
        attribute_type: 'tag',
        value: ['friends'],
        operator: 'any'
      }
    ],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(3)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address', 'Email 2'])
}

describe('Analytics', () => {
  createContext()
  beforeEach(setup)

  describe('Contact Export', () => {
    it('should export contacts in joint format', testExportJoint)
    it(
      'should export contacts in joint format with a filter',
      testExportJointWithFilter
    )
    it(
      'should export contacts in joint format with exclusiion',
      testExportJointWithExclusion
    )
    it('should export contacts in non-joint format', testNormalExport)
    it(
      'should export contacts in non-joint format with a filter',
      testNormalExportWithFilter
    )
    it(
      'should export contacts in non-joint format with exclusion',
      testNormalExportWithExclusion
    )
  })
})
