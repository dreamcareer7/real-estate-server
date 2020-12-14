const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const GoogleContact    = require('../../../lib/models/Google/contact')

const { createGoogleMessages } = require('./helper')

const google_contacts_offline       = require('./data/google_contacts.json')
const google_contact_groups_offline = require('./data/google_contact_groups.json')

let user, brand



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential } = await createGoogleMessages(user, brand)

  const records = []

  for (const gContact of google_contacts_offline) {
    records.push({ google_credential: credential.id, entry_id: gContact.entry_id, entry: JSON.stringify(gContact.entry) })
  }

  const createdGoogleContacts = await GoogleContact.create(records)

  for (const createdGoogleContact of createdGoogleContacts) {
    expect(createdGoogleContact.google_credential).to.be.equal(credential.id)

    const googleContact = await GoogleContact.getByEntryId(createdGoogleContact.google_credential, createdGoogleContact.entry_id)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(createdGoogleContact.google_credential)
    expect(googleContact.entry_id).to.be.equal(createdGoogleContact.entry_id)
    expect(googleContact.entry.names.fullName).to.be.equal(createdGoogleContact.entry.names.fullName)
  }

  return createdGoogleContacts
}

async function getByEntryId() {
  const googleContacts = await create()

  for (const gContact of googleContacts) {

    const googleContact = await GoogleContact.getByEntryId(gContact.google_credential, gContact.entry_id)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(gContact.google_credential)
    expect(googleContact.entry_id).to.be.equal(gContact.entry_id)
    expect(googleContact.entry.names.fullName).to.be.equal(gContact.entry.names.fullName)
  }
}

async function getByEntryIdFailed() {
  const bad_id = user.id

  const googleContact = await GoogleContact.getByEntryId(bad_id, bad_id)

  expect(googleContact).to.be.equal(null)
}

async function getByResourceId() {
  const googleContacts = await create()

  for (const gContact of googleContacts) {

    const googleContact = await GoogleContact.getByResourceId(gContact.google_credential, gContact.resource_id)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(gContact.google_credential)
    expect(googleContact.resource_id).to.be.equal(gContact.resource_id)
    expect(googleContact.entry.names.fullName).to.be.equal(gContact.entry.names.fullName)
  }
}

async function getGCredentialContactsNum() {
  const googleContacts = await create()

  const result = await GoogleContact.getGCredentialContactsNum(googleContacts[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleContacts.length)
}

async function addContactGroups() {
  const { credential } = await createGoogleMessages(user, brand)

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

async function getRefinedContactGroups() {
  const googleContacts = await create()
  const { credential } = await createGoogleMessages(user, brand)

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

    it('should create some google-contacts', create)
    it('should return google-contact by entry_id', getByEntryId)
    it('should handle failure of google-contact get by entry_id', getByEntryIdFailed)
    it('should return google-contact by resource_id', getByResourceId)
    it('should return number of contacts of specific credential', getGCredentialContactsNum)
    it('should handle add contact groups', addContactGroups)
    it('should return number of contacts of specific credential', getRefinedContactGroups)
  })
})
