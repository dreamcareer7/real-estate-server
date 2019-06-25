const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')


let user, brand

const google_details = {
  address_1: 'saeed.uni68@gmail.com',
  tokens_1: {
    access_token: 'ya29.GlsSB5gTTkynEx16V7EnNexoVj15uo5277RNLpoGQXHuqn3UAAQ_iRZ1x7V5dzd--90eCb0Kr5F0UwMiPemjJpK2SeU24P7hxLivNitL4yJX6uOaaYM_ObY65EF9',
    refresh_token: '1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    token_type: 'Bearer',
    expiry_date: 1558581374
  },
  
  address_2: 'saeed@rechat.com',
  tokens_2: {
    access_token: 'ya29.GlsUBzA2jx8dx_keCJver96nMm-eAEUHHO-olVoNyuHAdNcCeVZTHGu8gskwbz5lJKiYCX2XTX8nvBIg-FaFGMWyAkD0rPqKt3Z-6lwwOtU-rLcjEzzufD1yS8q4',
    refresh_token: '1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    expiry_date: 1558581374
  },

  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/contacts.readonly'
  ]
}



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createCredential() {
  const body = {
    user: user.id,
    brand: brand.id,

    profile: {
      resourceName: 'people/101097287757226633710',
      emailAddress: google_details.address_1,
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

async function updateCredentialTokens() {
  const createdCredential = await createCredential()
  const TS = Math.round(new Date().getTime() / 1000)

  const tokens = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expiry_date: Number(TS)
  }
  await GoogleCredential.updateTokens(createdCredential.id, tokens)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.access_token).to.be.equal(tokens.access_token)
}

async function updateCredentialAsRevoked() {
  const createdCredential = await createCredential()
  expect(createdCredential.revoked).to.be.equal(false)

  await GoogleCredential.updateAsRevoked(createdCredential.id)
  const updatedCredential = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential.revoked).to.be.equal(true)
}

async function updateCredentialProfile() {
  const createdCredential = await createCredential()

  const profile = {
    displayName: 'displayName',
    firstName: 'firstName',
    lastName: 'lastName',
    photo: 'http://....'
  }
  await GoogleCredential.updateProfile(createdCredential.id, profile)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.display_name).to.be.equal(profile.displayName)
}

async function updateCredentialGmailProfile() {
  const createdCredential = await createCredential()

  const profile = {
    messagesTotal: 100,
    threadsTotal: 15,
    historyId: 1410
  }
  await GoogleCredential.updateGmailProfile(createdCredential.id, profile)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.messages_total).to.be.equal(profile.messagesTotal)
}

async function updateContactsSyncToken() {
  const createdCredential = await createCredential()

  const syncToken = 'syncToken'
  await GoogleCredential.updateContactsSyncToken(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.contacts_sync_token).to.be.equal(syncToken)
}

async function updateContactGroupsSyncToken() {
  const createdCredential = await createCredential()

  const syncToken = 'syncToken'
  await GoogleCredential.updateContactGroupsSyncToken(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.contact_groups_sync_token).to.be.equal(syncToken)
}

async function updateMessagesSyncHistoryId() {
  const createdCredential = await createCredential()

  const syncToken = 'syncToken'
  await GoogleCredential.updateMessagesSyncHistoryId(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.messages_sync_history_id).to.be.equal(syncToken)
}

async function updateThreadsSyncHistoryId() {
  const createdCredential = await createCredential()

  const syncToken = 'syncToken'
  await GoogleCredential.updateThreadsSyncHistoryId(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.threads_sync_history_id).to.be.equal(syncToken)
}

async function updateLastSyncTime() {
  const createdCredential = await createCredential()

  const ts = new Date()
  const duration = 100
  await GoogleCredential.updateLastSyncTime(createdCredential.id, ts, duration)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(new Date(updatedCredential.last_sync_at).getTime()).to.be.equal(new Date(ts).getTime())
  expect(updatedCredential.last_sync_duration).to.be.equal(duration)
}



describe('Google', () => {
  describe('Google Account', () => {
    createContext()
    beforeEach(setup)

    it('should create a google-credential (semi-grant-access)', createCredential)
    it('should update a google-credential tokens', updateCredentialTokens)
    it('should revoke a google-credential', updateCredentialAsRevoked)
    it('should update a google-credential profile', updateCredentialProfile)
    it('should update a google-credential gmail-profile', updateCredentialGmailProfile)
    it('should update a google-credential contact sync token', updateContactsSyncToken)
    it('should update a google-credential contact-group sync token', updateContactGroupsSyncToken)
    it('should update a google-credential messages sync token', updateMessagesSyncHistoryId)
    it('should update a google-credential threads sync token', updateThreadsSyncHistoryId)
    it('should update a google-credential last sync time', updateLastSyncTime)
  })
})