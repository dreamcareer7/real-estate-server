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
  expect(facts).to.have.length(1)
  expect(facts[0]).to.be.eql({
    marketing_name: 'John Doe and Jane Doe',
    full_street_name: '1505 Elm Street Unit UNIT 1101',
    city: 'Dallas',
    state: 'Texas',
    postcode: '75201'
  })

  const headers = await queryBuilder.headerMapper(facts[0])
  expect(headers).to.include.members([
    'Marketing Name',
    'Full Street Name',
    'City',
    'State',
    'Zip Code'
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
  expect(headers).to.have.members(['First Name', 'Last Name', 'E-mail Address'])
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
  expect(headers).to.have.members(['First Name', 'Last Name', 'E-mail Address'])
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
  expect(headers).to.have.members(['First Name', 'Last Name', 'E-mail Address'])
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
  expect(headers).to.include.members(['First Name', 'Last Name', 'E-mail Address'])
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
