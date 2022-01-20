const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const Contact          = require('../../../lib/models/Contact/manipulate')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const MicrosoftContact = require('../../../lib/models/Microsoft/contact')
const ContactIntegration = require('../../../lib/models/ContactIntegration')
const { 
  findNewAttributes 
} = require('../../../lib/models/Microsoft/workers/contacts/people/helpers/attributes')

const { attributes } = require('../contact/helper')
const { createMicrosoftCredential } = require('./helper')
const { hardDelete: deleteIntegrations } = require('../../../lib/models/ContactIntegration/delete')

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
  const integration_records = []

  for (const mcontact of microsoft_contacts_offline) {
    const contactIds = await createContact()

    records.push({
      microsoft_credential: credential.id,
      contact: contactIds[0],
      remote_id: mcontact.id,
      data: JSON.stringify(mcontact.data),
      source: mcontact.source,
      etag: 'etag',
      parked: false
    })
  }

  const createdMicrosoftContacts = await MicrosoftContact.create(records)

  for (const createdMicrosoftContact of createdMicrosoftContacts) {    
    const microsoftContact = await MicrosoftContact.getByRemoteId(createdMicrosoftContact.microsoft_credential, createdMicrosoftContact.remote_id)
    
    integration_records.push({
      microsoft_id: microsoftContact.id,
      google_id: null,
      contact: createdMicrosoftContact.contact,
      origin: 'microsoft',
      etag: 'etag',
      local_etag: 'local_etag'
    })

    expect(createdMicrosoftContact.microsoft_credential).to.be.equal(credential.id)
    expect(microsoftContact.type).to.be.equal('microsoft_contact')
    expect(microsoftContact.microsoft_credential).to.be.equal(createdMicrosoftContact.microsoft_credential)
    expect(microsoftContact.remote_id).to.be.equal(createdMicrosoftContact.remote_id)
    expect(microsoftContact.contact).to.not.be.equal(null)
  }

  const result = await ContactIntegration.insert(integration_records)
  expect(result.length).to.be.equal(integration_records.length)

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
      source: mcontact.source,
      etag: 'etag',
      parked: false
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

async function hardDelete() {
  const created = await create()
  const integrations = await ContactIntegration.getByMicrosoftIds([created[0].id])

  await deleteIntegrations([integrations[0].id])
  await MicrosoftContact.hardDelete([created[0].id])

  try {
    await MicrosoftContact.get(created[0].id)
  } catch (ex) {
    expect(ex.message).to.be.equal(`Microsoft contact by id ${created[0].id} not found.`)
  }
}

async function resetContactIntegration() {
  const created = await create()

  const before = await ContactIntegration.getByMicrosoftIds([created[0].id])
  expect(before.length).to.be.equal(1)

  await MicrosoftContact.resetContactIntegration(user.id, brand.id)

  try {
    await MicrosoftContact.get(created[0].id)
  } catch (ex) {
    expect(ex.message).to.be.equal(`Microsoft contact by id ${created[0].id} not found.`)
  }

  const after = await ContactIntegration.getByMicrosoftIds([created[0].id])
  expect(after.length).to.be.equal(0)
}

async function contactAttributeUpdate() {
  // This method should be updated fot each attribute
  const data = {
    'id': 'AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0A3vdaSQcSnEazMnWI1bbVjAAAJe4Z7wAA',
    'title': null,
    'surname': 'Sang3',
    'birthday': null,
    'jobTitle': null,
    'nickName': null,
    'changeKey': 'EQAAABYAAADe91pJBxKcRrMydYjVttWMAAAl63a3',
    'givenName': 'Saloom3',
    'categories': [],
    'homePhones': [],
    'middleName': null,
    'spouseName': null,
    '@odata.etag': 'W/"EQAAABYAAADe91pJBxKcRrMydYjVttWMAAAl63a3"',
    '@odata.type': '#microsoft.graph.contact',
    'companyName': 'compaa',
    'displayName': 'Saloom3 Sang3',
    'homeAddress': {},
    'mobilePhone': null,
    'otherAddress': {},
    'personalNotes': '',
    'businessPhones': [],
    'emailAddresses': [
      {
        'name': 'samlo3@sang3.com',
        'address': 'samlo3@sang3.com'
      }
    ],
    'parentFolderId': 'AQMkADAwATNiZmYAZC00NAAzNy1iZDkxLTAwAi0wMAoALgAAAzaRB-o7U85BpvwI1n_Wgy4BAN73WkkHEpxGszJ1iNW21YwAAAIBDgAAAA==',
    'businessAddress': {},
    'createdDateTime': '2022-01-20T17:18:29Z',
    'businessHomePage': null,
    'lastModifiedDateTime': '2022-01-20T18:41:38Z'
  }
  const oldData =  {
    'id': 'AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0A3vdaSQcSnEazMnWI1bbVjAAAJe4Z7wAA',
    'title': null,
    'surname': 'Sang2',
    'birthday': null,
    'jobTitle': null,
    'nickName': null,
    'changeKey': 'EQAAABYAAADe91pJBxKcRrMydYjVttWMAAAl63Zx',
    'givenName': 'Saloom2',
    'categories': [],
    'homePhones': [],
    'middleName': null,
    'spouseName': null,
    '@odata.etag': 'W/"EQAAABYAAADe91pJBxKcRrMydYjVttWMAAAl63Zx"',
    '@odata.type': '#microsoft.graph.contact',
    'companyName': null,
    'displayName': 'Saloom2 Sang2',
    'homeAddress': {},
    'mobilePhone': null,
    'otherAddress': {},
    'personalNotes': '',
    'businessPhones': [],
    'emailAddresses': [
      {
        'name': 'samlo2@sang2.com',
        'address': 'samlo2@sang2.com'
      }
    ],
    'parentFolderId': 'AQMkADAwATNiZmYAZC00NAAzNy1iZDkxLTAwAi0wMAoALgAAAzaRB-o7U85BpvwI1n_Wgy4BAN73WkkHEpxGszJ1iNW21YwAAAIBDgAAAA==',
    'businessAddress': {},
    'createdDateTime': '2022-01-20T17:18:29Z',
    'businessHomePage': null,
    'lastModifiedDateTime': '2022-01-20T17:19:17Z'
  }
  const refinedAtts = [
    {
      'id': 'f0a9c158-b992-45c7-901d-565ab65f86b7',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': '5ca36b57-256c-4c59-ae55-ec2df0cb5c79',
      'created_at': 1642704004.54976,
      'updated_at': 1642704004.54976,
      'deleted_at': null,
      'label': null,
      'is_primary': false,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'source_type',
      'text': 'Microsoft',
      'date': null,
      'type': 'contact_attribute'
    },
    {
      'id': 'cfd5f795-9f33-4f9c-807f-456018bc0ed6',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': 'b14d0fad-a96e-4d08-aad7-8a4191886d4d',
      'created_at': 1642704004.56652,
      'updated_at': 1642704004.56652,
      'deleted_at': null,
      'label': null,
      'is_primary': false,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'first_name',
      'text': 'Saloom2',
      'date': null,
      'type': 'contact_attribute'
    },
    {
      'id': '7a60eef0-e90e-4ea5-ad20-2b44f215e65e',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': '54c70044-370b-4223-af17-4da2bc7a7f5d',
      'created_at': 1642704004.56982,
      'updated_at': 1642704004.56982,
      'deleted_at': null,
      'label': null,
      'is_primary': false,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'last_name',
      'text': 'Sang2',
      'date': null,
      'type': 'contact_attribute'
    },
    {
      'id': '12c44eae-9d89-4a37-a217-f04554002469',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': '0aa03800-e740-4a04-90ea-c43f9581d2f9',
      'created_at': 1642704004.57257,
      'updated_at': 1642704004.57257,
      'deleted_at': null,
      'label': 'Other',
      'is_primary': true,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'email',
      'text': 'samlo2@sang2.com',
      'date': null,
      'type': 'contact_attribute'
    },
    {
      'id': '91b872c5-4891-4248-9dd9-70bc6ea6a967',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': '312a3cac-c2f6-4a28-8425-5548cc08c9da',
      'created_at': 1642704007.50461,
      'updated_at': 1642704007.50461,
      'deleted_at': null,
      'label': null,
      'is_primary': false,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'profile_image_url',
      'text': 'https://d2dzyv4cb7po1i.cloudfront.net/afdb83a6-6e6b-11ec-ae4b-42010a960002/avatars/636665c0-7a20-11ec-a415-ffdb8f7c1bef.jpg',
      'date': null,
      'type': 'contact_attribute'
    },
    {
      'id': '29ad2137-b48d-4f01-9e14-167179410049',
      'contact': 'ab1285af-4cef-4970-97b9-fbc338218144',
      'attribute_def': '802e7a96-ae9f-41bf-9eba-56e210b57643',
      'created_at': 1642704007.50733,
      'updated_at': 1642704007.50733,
      'deleted_at': null,
      'label': null,
      'is_primary': false,
      'is_partner': false,
      'index': null,
      'created_by': '26b22f76-6e6b-11ec-849f-42010a960002',
      'updated_by': null,
      'attribute_type': 'cover_image_url',
      'text': 'https://d2dzyv4cb7po1i.cloudfront.net/afdb83a6-6e6b-11ec-ae4b-42010a960002/avatars/636665c0-7a20-11ec-a415-ffdb8f7c1bef.jpg',
      'date': null,
      'type': 'contact_attribute'
    }
  ]
  const contactFolders = {
    'AQMkADAwATNiZmYAZC00NAAzNy1iZDkxLTAwAi0wMAoALgAAAzaRB-o7U85BpvwI1n_Wgy4BAN73WkkHEpxGszJ1iNW21YwAAAAjOv_bAAAA': 'VIP',
    'AQMkADAwATNiZmYAZC00NAAzNy1iZDkxLTAwAi0wMAoALgAAAzaRB-o7U85BpvwI1n_Wgy4BAN73WkkHEpxGszJ1iNW21YwAAAAjOv_cAAAA': '1 new',
    'AQMkADAwATNiZmYAZC00NAAzNy1iZDkxLTAwAi0wMAoALgAAAzaRB-o7U85BpvwI1n_Wgy4BAN73WkkHEpxGszJ1iNW21YwAAAAO7164AAAA': 'Importants'
  }

  const finalAttributes = [
    {
      id: 'cfd5f795-9f33-4f9c-807f-456018bc0ed6',
      attribute_type: 'first_name',
      text: 'Saloom3'
    },
    {
      id: '7a60eef0-e90e-4ea5-ad20-2b44f215e65e',
      attribute_type: 'last_name',
      text: 'Sang3'
    },
    { attribute_type: 'company', text: 'compaa' },
    {
      attribute_type: 'email',
      text: 'samlo3@sang3.com',
      label: 'Other',
      is_primary: false
    }
  ]

  // @ts-ignore
  const {attributes, deletedAtt} = findNewAttributes(data, oldData, refinedAtts, contactFolders)

  expect(deletedAtt.length).to.be.equal(1)
  expect(deletedAtt[0]).to.be.equal('12c44eae-9d89-4a37-a217-f04554002469')
  expect(attributes.length).to.be.equal(4)
  expect(attributes).to.be.deep.equal(finalAttributes)
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
    it('should permanently delete several Microsoft contact records', hardDelete)
    it('should reset contact integration links', resetContactIntegration)
    it('should update contact attribute', contactAttributeUpdate)
  })
})