const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleContact    = require('../../../lib/models/Google/contact')


const google_contacts_offline       = require('./data/google_contacts.json')
const google_contact_groups_offline = require('./data/google_contact_groups.json')

let user, brand

const google_details = {
  address_1: 'saeed.uni68@gmail.com',
  tokens_1: {
    access_token: 'ya29.GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: '1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    token_type: 'Bearer',
    expiry_date: 1558581374
  },
  
  address_2: 'saeed@rechat.com',
  tokens_2: {
    access_token: 'ya29.GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: '1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    expiry_date: 1558581374
  },

  scope: [
    'email',
    'profile',
    'openid',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts.readonly'
  ]
}


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createGoogleCredential() {
  const body = {
    user: user.id,
    brand: brand.id,

    profile: {
      emailAddress: google_details.address_1,
      resourceName: 'people/101097287757226633710',
      displayName: 'Saeed Vayghani',
      firstName: 'Saeed',
      lastName: 'Vayghani',
      photo: 'https://lh5.googleusercontent.com/...',
  
      messagesTotal: 100,
      threadsTotal: 100,
      historyId: 100
    },

    tokens: google_details.tokens_1,

    scope: google_details.scope
  }

  const credentialId = await GoogleCredential.create(body)
  const credential   = await GoogleCredential.get(credentialId)

  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.emailAddress)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function create() {
  const credential = await createGoogleCredential()

  const records = []

  for (const gContact of google_contacts_offline) {
    records.push({ google_credential: credential.id, entry_id: gContact.entry_id, entry: JSON.stringify(gContact.entry) })
  }

  const createdGoogleContacts = await GoogleContact.create(records)

  for (const createdGoogleContact of createdGoogleContacts) {
    expect(createdGoogleContact.google_credential).to.be.equal(credential.id)

    const googleContact = await GoogleContact.get(createdGoogleContact.entry_id, createdGoogleContact.google_credential)

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

    const googleContact = await GoogleContact.get(gContact.entry_id, gContact.google_credential)

    expect(googleContact.type).to.be.equal('google_contact')
    expect(googleContact.google_credential).to.be.equal(gContact.google_credential)
    expect(googleContact.entry_id).to.be.equal(gContact.entry_id)
    expect(googleContact.entry.names.fullName).to.be.equal(gContact.entry.names.fullName)
  }
}

async function getByEntryIdFailed() {
  const bad_id = user.id

  const googleContact = await GoogleContact.get(bad_id, bad_id)

  expect(googleContact).to.be.equal(null)
}

async function getGCredentialContactsNum() {
  const googleContacts = await create()

  const result = await GoogleContact.getGCredentialContactsNum(googleContacts[0]['google_credential'])

  expect(result[0]['count']).to.be.equal(googleContacts.length)
}

async function getRefinedContactGroups() {
  const googleContacts = await create()
  const credential     = await createGoogleCredential()

  const contactGroups = []

  for (const record of google_contact_groups_offline) {
    contactGroups.push({
      entry_id: record.entry_id,
      entry: record.entry
    })
  }

  for (const contactGroup of contactGroups) {
    await GoogleContact.addContactGroup(credential, contactGroup)
  }

  const result = await GoogleContact.getRefinedContactGroups(googleContacts[0]['google_credential'])

  const arr = ['Coworkers', 'Contacts']

  for ( const key in result ) {
    expect(arr.includes(result[key])).to.be.equal(true)
  }
}



describe('Google', () => {
  describe('Google Contacts', () => {
    createContext()
    beforeEach(setup)

    it('should create some google-contacts', create)
    it('should return google-contact by entry_id', getByEntryId)
    it('should handle failure of google-contact get by entry_id', getByEntryIdFailed)
    it('should return number of contacts of specific credential', getGCredentialContactsNum)
    it('should return number of contacts of specific credential', getRefinedContactGroups)
  })
})