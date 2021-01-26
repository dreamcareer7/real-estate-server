const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const GoogleContact    = require('../../../lib/models/Google/contact')

const { createGoogleCredential } = require('./helper')

const google_contacts_offline       = require('./data/google_contacts.json')
const google_contact_groups_offline = require('./data/google_contact_groups.json')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential } = await createGoogleCredential(user, brand)

  const records = []

  for (const gContact of google_contacts_offline) {
    records.push({
      google_credential: credential.id,
      entry_id: gContact.entry_id,
      contact: null,
      etag: gContact.etag,
      resource_id: gContact.resource_id,
      resource: JSON.stringify(gContact),
      parked: gContact.parked
    })
  }

  const createdGoogleContacts = await GoogleContact.create(records)

  for (const createdGoogleContact of createdGoogleContacts) {
    expect(createdGoogleContact.google_credential).to.be.equal(credential.id)

    const googleContact = await GoogleContact.getByResourceId(createdGoogleContact.google_credential, createdGoogleContact.resource_id)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(createdGoogleContact.google_credential)
  }

  return createdGoogleContacts
}

async function update() {
  const { credential } = await createGoogleCredential(user, brand)
  const googleContacts = await create()

  const sample  = { key: 'val' }
  const records = []

  for (const gContact of googleContacts) {
    records.push({
      google_credential: credential.id,
      entry_id: gContact.entry_id,
      etag: gContact.etag,
      resource_id: gContact.resource_id,
      resource: JSON.stringify(sample),
      parked: true
    })
  }

  const result = await GoogleContact.update(records)

  for (const gcontact of result) {
    expect(gcontact.google_credential).to.be.equal(credential.id)
    expect(gcontact.contact).to.be.equal(null)
    expect(gcontact.resource).to.be.deep.equal(sample)
  }
}

async function getByResourceId() {
  const googleContacts = await create()

  for (const gContact of googleContacts) {
    const googleContact = await GoogleContact.getByResourceId(gContact.google_credential, gContact.resource_id)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(gContact.google_credential)
    expect(googleContact.resource_id).to.be.equal(gContact.resource_id)
    expect(googleContact.resource.names.fullName).to.be.equal(gContact.resource.names.fullName)
  }
}

async function getContactsNum() {
  const googleContacts = await create()

  const result = await GoogleContact.getContactsNum(googleContacts[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleContacts.length)
}

async function deleteMany() {
  const created = await create()
  const ids = created.map(c => c.id)

  const googleContacts = await GoogleContact.getAll(ids)

  for (const gContact of googleContacts) {
    expect(gContact.type).to.be.equal('google_contact')
    expect(gContact.deleted_at).to.be.equal(null)
  }

  await GoogleContact.deleteMany(ids)
  const deletedContacts = await GoogleContact.getAll(ids)

  for (const gContact of deletedContacts) {
    expect(gContact.type).to.be.equal('google_contact')
    expect(gContact.deleted_at).to.not.be.equal(null)
  }
}

async function restoreMany() {
  const created = await create()
  const ids = created.map(c => c.id)

  await GoogleContact.deleteMany(ids)
  const deletedContacts = await GoogleContact.getAll(ids)

  for (const gContact of deletedContacts) {
    expect(gContact.type).to.be.equal('google_contact')
    expect(gContact.deleted_at).to.not.be.equal(null)
  }

  await GoogleContact.restoreMany(ids)
  const restoredContacts = await GoogleContact.getAll(ids)

  for (const gContact of restoredContacts) {
    expect(gContact.type).to.be.equal('google_contact')
    expect(gContact.deleted_at).to.be.equal(null)
  }
}

async function addContactGroups() {
  const { credential } = await createGoogleCredential(user, brand)

  const contactGroups = []

  for (const group of google_contact_groups_offline) {
    contactGroups.push({
      google_credential: credential.id,
      resource_id: group.resourceName,
      resource_name: group.name,
      resource: JSON.stringify(group)
    })
  }

  const result = await GoogleContact.addContactGroups(contactGroups)
  expect(contactGroups.length).to.be.equal(result.length)
}

async function deleteManyCGroups() {
  const { credential } = await createGoogleCredential(user, brand)

  const contactGroups = []

  for (const group of google_contact_groups_offline) {
    contactGroups.push({
      google_credential: credential.id,
      resource_id: group.resourceName,
      resource_name: group.name,
      resource: JSON.stringify(group)
    })
  }

  const result = await GoogleContact.addContactGroups(contactGroups)
  expect(contactGroups.length).to.be.equal(result.length)

  const deletedGroups = result.map(group => {
    return {
      google_credential: group.google_credential,
      resource_id: group.resource_id
    }
  })

  await GoogleContact.deleteManyCGroups(deletedGroups)

  const groups = await GoogleContact.getRefinedContactGroups(credential.id)
  expect(groups).to.be.deep.equal({})
}

async function getRefinedContactGroups() {
  const googleContacts = await create()
  const { credential } = await createGoogleCredential(user, brand)

  const contactGroups = []

  for (const group of google_contact_groups_offline) {
    contactGroups.push({
      google_credential: credential.id,
      resource_id: group.resourceName,
      resource_name: group.name,
      resource: JSON.stringify(group)
    })
  }

  await GoogleContact.addContactGroups(contactGroups)

  const result = await GoogleContact.getRefinedContactGroups(googleContacts[0]['google_credential'])

  expect(result['contactGroups/29feafa40ce31955']).to.be.equal('label custom')
  expect(result['contactGroups/22f91a7f0c902036']).to.be.equal('labelx')
  expect(result['contactGroups/friends']).to.be.equal('friends')
}


describe('Google', () => {
  describe('Google Contacts', () => {
    createContext()
    beforeEach(setup)

    it('should create several Google contacts', create)
    it('should update several Google contacts', update)
    it('should return Google contact by resource_id', getByResourceId)
    it('should return several Google contacts owned by a specific credential', getContactsNum)
    it('should delete Google contacts by id', deleteMany)
    it('should restore Google contacts by id', restoreMany)
    it('should handle add Google contact groups', addContactGroups)
    it('should deleted Google contact groups', deleteManyCGroups)
    it('should return a refined object of Google contact groups', getRefinedContactGroups)
  })
})