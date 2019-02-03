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
}

describe('Analytics', () => {
  createContext()
  beforeEach(setup)

  describe('Contact Export', () => {
    it('should export contacts in joint format', testExportJoint)
    it('should export contacts in non-joint format', testNormalExport)
  })
})
