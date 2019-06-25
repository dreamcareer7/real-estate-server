const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')

const Contact = require('../../../lib/models/Contact')
const Context = require('../../../lib/models/Context')
const User = require('../../../lib/models/User')
const {
  ContactJointExportQueryBuilder,
  ContactEmailExportQueryBuilder,
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
    'Home Address',
    'Home City',
    'Home State',
    'Home Zip Code',
    'Work Address',
    'Work City',
    'Work State',
    'Work Zip Code',
    'Other Address',
    'Other City',
    'Other State',
    'Other Zip Code',
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

async function testEmailExport() {
  const queryBuilder = new ContactEmailExportQueryBuilder(
    null,
    [],
    user.id,
    brand.id
  )

  const facts = await queryBuilder.facts({})
  expect(facts).to.have.length(4)

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members(['First Name', 'Last Name', 'E-mail Address', 'Email 2'])
}

async function testEmailExportWithNotFilter() {
  const queryBuilder = new ContactEmailExportQueryBuilder(
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

async function testEmailExportWithExclusion() {
  const queryBuilder = new ContactEmailExportQueryBuilder(
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

async function testEmailExportWithFilter() {
  const queryBuilder = new ContactEmailExportQueryBuilder(
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
    it('should export contacts in email format', testEmailExport)
    it(
      'should export contacts in email format with not filter',
      testEmailExportWithNotFilter
    )
    it(
      'should export contacts in email format with a filter',
      testEmailExportWithFilter
    )
    it(
      'should export contacts in email format with exclusion',
      testEmailExportWithExclusion
    )
  })
})
