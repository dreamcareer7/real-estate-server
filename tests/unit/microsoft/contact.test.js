const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User/get')
const BrandHelper         = require('../brand/helper')
const MicrosoftContact    = require('../../../lib/models/Microsoft/contact')

const { createMicrosoftCredential } = require('./helper')

const microsoft_contacts_offline        = require('./data/microsoft_contacts.json')
const microsoft_contact_folders_offline = require('./data/microsoft_contact_folders.json')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential } = await createMicrosoftCredential(user, brand)

  const records = []

  for (const mContact of microsoft_contacts_offline) {
    records.push({
      microsoft_credential: credential.id,
      contact: null,
      remote_id: mContact.id,
      data: JSON.stringify(mContact.data),
      source: mContact.source
    })
  }

  const createdMicrosoftContacts = await MicrosoftContact.create(records)

  for (const createdMicrosoftContact of createdMicrosoftContacts) {
    expect(createdMicrosoftContact.microsoft_credential).to.be.equal(credential.id)

    const microsoftContact = await MicrosoftContact.get(createdMicrosoftContact.remote_id, createdMicrosoftContact.microsoft_credential)

    expect(microsoftContact.type).to.be.equal('microsoft_contact')
    expect(microsoftContact.microsoft_credential).to.be.equal(createdMicrosoftContact.microsoft_credential)
    expect(microsoftContact.remote_id).to.be.equal(createdMicrosoftContact.remote_id)
  }

  return createdMicrosoftContacts
}

async function update() {
  const { credential } = await createMicrosoftCredential(user, brand)
  const microsoftContacts = await create()

  const sample  = { key: 'val' }
  const records = []

  for (const mContact of microsoftContacts) {
    records.push({
      microsoft_credential: credential.id,
      remote_id: mContact.id,
      data: JSON.stringify(sample),
      source: mContact.source
    })
  }

  const result = await MicrosoftContact.update(records)

  for (const mcontact of result) {
    expect(mcontact.microsoft_credential).to.be.equal(credential.id)
    expect(mcontact.contact).to.be.equal(null)
    expect(mcontact.data).to.be.deep.equal(sample)
  }
}


async function getByEntryId() {
  const microsoftContacts = await create()

  for (const gContact of microsoftContacts) {

    const googleContact = await MicrosoftContact.get(gContact.remote_id, gContact.microsoft_credential)

    expect(googleContact.type).to.be.equal('microsoft_contact')
    expect(googleContact.microsoft_credential).to.be.equal(gContact.microsoft_credential)
    expect(googleContact.remote_id).to.be.equal(gContact.remote_id)
  }
}

async function getByEntryIdFailed() {
  const bad_id = user.id

  const googleContact = await MicrosoftContact.get(bad_id, bad_id)

  expect(googleContact).to.be.equal(null)
}

async function getMCredentialContactsNum() {
  const microsoftContacts = await create()

  const result = await MicrosoftContact.getMCredentialContactsNum(microsoftContacts[0]['microsoft_credential'], ['sentBox', 'contacts'])

  expect(result[0]['count']).to.be.equal(microsoftContacts.length)
}

async function addContactFolder() {
  const { credential } = await createMicrosoftCredential(user, brand)

  const contactFolders = []

  for (const record of microsoft_contact_folders_offline) {
    contactFolders.push({
      folder_id: record.id,
      parent_folder_id: record.parentFolderId,
      display_name: record.displayName
    })
  }

  for (const contactGroup of contactFolders) {
    const result = await MicrosoftContact.addContactFolder(credential, contactGroup)
    expect(result).to.be.uuid
  }
}

async function getRefinedContactFolders() {
  const microsoftContacts = await create()
  const { credential } = await createMicrosoftCredential(user, brand)

  const contactFolders = []

  for (const record of microsoft_contact_folders_offline) {
    contactFolders.push({
      folder_id: record.id,
      parent_folder_id: record.parentFolderId,
      display_name: record.displayName
    })
  }

  for (const contactGroup of contactFolders) {
    await MicrosoftContact.addContactFolder(credential, contactGroup)
  }

  const result = await MicrosoftContact.getRefinedContactFolders(microsoftContacts[0]['microsoft_credential'])

  const arr = ['friends', 'rechat']

  for ( const key in result ) {
    expect(arr.includes(result[key])).to.be.equal(true)
  }
}

async function removeFoldersByCredential() {
  const { credential } = await createMicrosoftCredential(user, brand)

  const contactFolders = []

  for (const record of microsoft_contact_folders_offline) {
    contactFolders.push({
      folder_id: record.id,
      parent_folder_id: record.parentFolderId,
      display_name: record.displayName
    })
  }

  for (const contactGroup of contactFolders) {
    const result = await MicrosoftContact.addContactFolder(credential, contactGroup)
    expect(result).to.be.uuid
  }

  const before_delete = await MicrosoftContact.getCredentialFolders(credential.id)
  expect(before_delete.length).to.not.be.equal(0)

  await MicrosoftContact.removeFoldersByCredential(credential.id)

  const after_delete = await MicrosoftContact.getCredentialFolders(credential.id)
  expect(after_delete.length).to.be.equal(0)
}



describe('Microsoft', () => {
  describe('Microsoft Contacts', () => {
    createContext()
    beforeEach(setup)

    it('should create some microsoft contacts', create)
    it('should update some microsoft contacts', update)
    it('should return microsoft contact by remote_id', getByEntryId)
    it('should handle failure of microsoft contact get by remote_id', getByEntryIdFailed)
    it('should return number of contacts of specific credential', getMCredentialContactsNum)
    it('should handle add contact-folder', addContactFolder)
    it('should return number of contact-folders of specific credential', getRefinedContactFolders)
    it('should remove contact-folders by credential', removeFoldersByCredential)
  })
})
