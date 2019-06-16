const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')
const {
  ContactJointExportQueryBuilder,
  ContactExportQueryBuilder,
  ContactMailerExportQueryBuilder,
} = require('../../../lib/models/Analytics/OLAP')

const BrandHelper = require('../brand/helper')

const contacts = require('./data/contacts')

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
    'direct_request',
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

async function testExportMailer() {
  const queryBuilder = new ContactMailerExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(3)

  const headers = await queryBuilder.headerMapper(facts[0])

  Context.log(headers)
  expect(headers).to.include.members([
    'Title',
    'First Name',
    'Middle Name',
    'Last Name',
    'Marketing Name',
    'Company',
    'Home City',
    'Home State',
    'Home Zip Code',
    'Full Address Home',
    'Work City',
    'Work State',
    'Work Zip Code',
    'Full Address Work',
    'Other City',
    'Other State',
    'Other Zip Code',
    'Full Address Other'
  ])
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

async function testExportJointWithNotFilter() {
  const queryBuilder = new ContactJointExportQueryBuilder(
    null,
    [
      {
        attribute_type: 'tag',
        invert: true,
        operator: 'eq',
        value: 'friends'
      }
    ],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(1)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address'])
  expect(headers).not.to.include.members(['Email 2'])
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

async function testNormalExportWithNotFilter() {
  const queryBuilder = new ContactExportQueryBuilder(
    null,
    [
      {
        attribute_type: 'tag',
        invert: true,
        operator: 'eq',
        value: 'friends'
      }
    ],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(1)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['E-mail Address'])
  expect(headers).not.to.include.members(['Email 2'])
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
    it('should export contacts in mailer format', testExportMailer)
    it(
      'should export contacts in joint format with a filter',
      testExportJointWithFilter
    )
    it(
      'should export contacts in joint format with exclusiion',
      testExportJointWithExclusion
    )
    it(
      'should export contacts in joint format with not filter',
      testExportJointWithNotFilter
    )
    it('should export contacts in non-joint format', testNormalExport)
    it(
      'should export contacts in non-joint format with not filter',
      testNormalExportWithNotFilter
    )
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
