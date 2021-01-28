const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const Contact          = require('../../../lib/models/Contact/manipulate')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const MicrosoftContact = require('../../../lib/models/Microsoft/contact')

const { attributes } = require('../contact/helper')
const { createMicrosoftCredential } = require('./helper')

const microsoft_contacts_offline        = require('./data/microsoft_contacts.json')
const microsoft_contact_folders_offline = require('./data/microsoft_contact_folders.json')

let user, brand



async function createContact() {
  return Contact.create([{
    user: user.id,
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@doe.com',
    }),
  }], user.id, brand.id)
}

async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential } = await createMicrosoftCredential(user, brand)

  const records = []

  for (const mcontact of microsoft_contacts_offline) {
    const contactIds = await createContact()

    records.push({
      microsoft_credential: credential.id,
      contact: contactIds[0],
      remote_id: mcontact.id,
      data: JSON.stringify(mcontact.data),
      source: mcontact.source
    })
  }

  const createdMicrosoftContacts = await MicrosoftContact.create(records)

  for (const createdMicrosoftContact of createdMicrosoftContacts) {
    expect(createdMicrosoftContact.microsoft_credential).to.be.equal(credential.id)

    const microsoftContact = await MicrosoftContact.getByRemoteId(createdMicrosoftContact.microsoft_credential, createdMicrosoftContact.remote_id)

    expect(microsoftContact.type).to.be.equal('microsoft_contact')
    expect(microsoftContact.microsoft_credential).to.be.equal(createdMicrosoftContact.microsoft_credential)
    expect(microsoftContact.remote_id).to.be.equal(createdMicrosoftContact.remote_id)
    expect(microsoftContact.contact).to.not.be.equal(null)
  }

  return createdMicrosoftContacts
}

async function update() {
  const { credential } = await createMicrosoftCredential(user, brand)
  const microsoftContacts = await create()

  const sample  = { key: 'val' }
  const records = []

  for (const mcontact of microsoftContacts) {
    records.push({
      microsoft_credential: credential.id,
      remote_id: mcontact.remote_id,
      data: JSON.stringify(sample),
      source: mcontact.source
    })
  }

  const result = await MicrosoftContact.update(records)
  
  for (const mcontact of result) {
    expect(mcontact.microsoft_credential).to.be.equal(credential.id)
    expect(mcontact.contact).to.not.be.equal(null)
    expect(mcontact.data).to.be.deep.equal(sample)
  }
}

async function getByEntryId() {
  const microsoftContacts = await create()

  for (const gContact of microsoftContacts) {

    const microsoftContact = await MicrosoftContact.getByRemoteId(gContact.microsoft_credential, gContact.remote_id)

    expect(microsoftContact.type).to.be.equal('microsoft_contact')
    expect(microsoftContact.microsoft_credential).to.be.equal(gContact.microsoft_credential)
    expect(microsoftContact.remote_id).to.be.equal(gContact.remote_id)
  }
}

async function getByRechatContacts() {
  const microsoftContacts = await create()
  const gContact = microsoftContacts[0]

  const gcontacts = await MicrosoftContact.getByRechatContacts(gContact.microsoft_credential, [gContact.contact])

  expect(gcontacts.length).to.be.equal(1)
  expect(gcontacts[0].type).to.be.equal('microsoft_contact')
  expect(gcontacts[0].id).to.be.equal(gContact.id)
  expect(gcontacts[0].microsoft_credential).to.be.equal(gContact.microsoft_credential)
  expect(gcontacts[0].contact).to.be.equal(gContact.contact)
  expect(gcontacts[0].remote_id).to.be.equal(gContact.remote_id)
}

async function getByEntryIdFailed() {
  const bad_id = user.id

  const microsoftContact = await MicrosoftContact.getByRemoteId(bad_id, bad_id)

  expect(microsoftContact).to.be.equal(null)
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
    it('should return microsoft contact by rechat contacts', getByRechatContacts)
    it('should handle failure of microsoft contact get by remote_id', getByEntryIdFailed)
    it('should return number of contacts of specific credential', getMCredentialContactsNum)
    it('should handle add contact-folder', addContactFolder)
    it('should return number of contact-folders of specific credential', getRefinedContactFolders)
    it('should remove contact-folders by credential', removeFoldersByCredential)
  })
})