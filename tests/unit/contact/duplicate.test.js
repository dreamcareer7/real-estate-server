const { expect } = require('chai')

const { createContext, handleJobs } = require('../helper')
const contactsData = require('./data/duplicate.json')

const Contact = require('../../../lib/models/Contact')
const Duplicates = require('../../../lib/models/Contact/duplicate')
const Context = require('../../../lib/models/Context')
const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const UserHelper = require('../user/helper')

let user, brand, contact_ids

async function setup() {
  user = await UserHelper.TestUser()

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

async function testDuplicateClusters() {
  const duplicates = await Duplicates.findForBrand(brand.id)

  expect(duplicates).to.have.length(1)
}

async function testContactDuplicateCluster() {
  const duplicate = await Duplicates.findForContact(brand.id, contact_ids[0])

  expect(duplicate.contacts).to.have.length(3)
  expect(duplicate.contacts).to.have.members(contact_ids)
}

async function testRemoveContactFromCluster() {
  const duplicate = await Duplicates.findForContact(brand.id, contact_ids[0])

  await Duplicates.ignoreContactFromCluster(brand.id, duplicate.id, duplicate.contacts[2])
  await handleJobs()

  const new_clusters = await Duplicates.findForBrand(brand.id)
  expect(new_clusters).to.have.length(1)
  expect(new_clusters[0].contacts).to.have.members([contact_ids[0], contact_ids[1]])
}

describe('Contact', () => {
  createContext()
  beforeEach(setup)

  describe('Duplicates', () => {
    it('mark duplicates', testDuplicateClusters)
    it('find duplicate cluster for contact', testContactDuplicateCluster)
    it('remove contact from cluster', testRemoveContactFromCluster)
  })
})
