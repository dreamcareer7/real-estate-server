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

async function create() {
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

async function publicize() {
  const createdCredential = await create()
  const updatedCredential = await GoogleCredential.publicize(createdCredential)

  expect(updatedCredential.access_token).to.be.equal(undefined)
  expect(updatedCredential.refresh_token).to.be.equal(undefined)
  expect(updatedCredential.expiry_date).to.be.equal(undefined)
  expect(updatedCredential.contacts_sync_token).to.be.equal(undefined)
  expect(updatedCredential.contact_groups_sync_token).to.be.equal(undefined)
  expect(updatedCredential.messages_sync_history_id).to.be.equal(undefined)
  expect(updatedCredential.threads_sync_history_id).to.be.equal(undefined)
}

async function getByUser() {
  const createdCredential = await create()
  const credentials       = await GoogleCredential.getByUser(createdCredential.user, createdCredential.brand)

  expect(credentials.length).not.to.be.equal(0)

  for (const record of credentials) {
    expect(record.type).to.be.equal('google_credential')
    expect(record.user).to.be.equal(createdCredential.user)
    expect(record.brand).to.be.equal(createdCredential.brand)
  }
}

async function getByUserFailed() {
  const credentials = await GoogleCredential.getByUser(user.id, user.id)

  expect(credentials.length).to.be.equal(0)
}

async function getById() {
  const createdCredential = await create()
  const credential        = await GoogleCredential.get(createdCredential.id)

  expect(credential.type).to.be.equal('google_credential')
  expect(credential.user).to.be.equal(createdCredential.user)
  expect(credential.brand).to.be.equal(createdCredential.brand)
}

async function getByIdFailed() {
  try {
    const not_exist_credential_id = user.id
    await GoogleCredential.get(not_exist_credential_id)

  } catch (ex) {
    const message = `Google-Credential ${user.id} not found`

    expect(ex.message).to.be.equal(message)
  }
}

async function updateTokens() {
  const createdCredential = await create()
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

async function updateRefreshToken() {
  const createdCredential = await create()

  const new_refresh_token = 'new_refresh_token'

  await GoogleCredential.updateRefreshToken(createdCredential.id, new_refresh_token)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.refresh_token).to.be.equal(new_refresh_token)
}

async function updateAccesshToken() {
  const createdCredential = await create()

  const new_access_token = 'new_access_token'

  await GoogleCredential.updateAccesshToken(createdCredential.id, new_access_token)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.access_token).to.be.equal(new_access_token)
}

async function updateAsRevoked() {
  const createdCredential = await create()
  expect(createdCredential.revoked).to.be.equal(false)

  await GoogleCredential.updateAsRevoked(createdCredential.id)
  const updatedCredential = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential.revoked).to.be.equal(true)
}

async function updateLastSync() {
  const createdCredential = await create()

  const ts = new Date()
  const duration = 100
  await GoogleCredential.updateLastSync(createdCredential.id, ts, duration)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(new Date(updatedCredential.last_sync_at).getTime()).to.be.equal(new Date(ts).getTime())
  expect(updatedCredential.last_sync_duration).to.be.equal(duration)
}

async function updateSyncStatus() {
  const createdCredential = await create()

  const status = 'success'

  await GoogleCredential.updateSyncStatus(createdCredential.id, status)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.sync_status).to.be.equal(status)
}

async function disableEnableSync() {
  const createdCredential = await create()

  await GoogleCredential.disableEnableSync(createdCredential.id, 'disable')
  const updatedCredential_1 = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential_1.deleted_at).not.to.be.equal(null)


  await GoogleCredential.disableEnableSync(createdCredential.id, 'enable')
  const updatedCredential_2 = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential_2.deleted_at).to.be.equal(null)
}

async function disableEnableSyncFailed() {
  const not_exist_credential_id = user.id

  try {
    await GoogleCredential.disableEnableSync(not_exist_credential_id, 'disable')

  } catch (ex) {
    const message = `Google-Credential ${user.id} not found`

    expect(ex.message).to.be.equal(message)
  }
}

async function disableRevokedAccountFailed() {
  const createdCredential = await create()

  await GoogleCredential.updateAsRevoked(createdCredential.id)

  const returnFlag = await GoogleCredential.disableEnableSync(createdCredential.id, 'disable')

  expect(returnFlag).to.be.equal(true)
}

async function forceSync() {
  const createdCredential = await create()

  await GoogleCredential.forceSync(createdCredential.id)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.sync_status).to.be.equal(null)
  expect(updatedCredential.last_sync_at).to.be.equal(null)
  expect(updatedCredential.last_sync_duration).to.be.equal(null)
}

async function updateProfile() {
  const createdCredential = await create()

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

async function updateGmailProfile() {
  const createdCredential = await create()

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

async function updateContactsLastSyncAt() {
  const createdCredential = await create()

  await GoogleCredential.updateContactsLastSyncAt(createdCredential.id)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.contacts_last_sync_at).not.to.be.equal(null)
}

async function updateMessagesSyncHistoryId() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateMessagesSyncHistoryId(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.messages_sync_history_id).to.be.equal(syncToken)
}

async function updateThreadsSyncHistoryId() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateThreadsSyncHistoryId(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.threads_sync_history_id).to.be.equal(syncToken)
}


describe('Google', () => {
  describe('Google Account', () => {
    createContext()
    beforeEach(setup)

    it('should create a google-credential (semi-grant-access)', create)
    it('should publicize a google-credential', publicize)

    it('should return a google-credential by user-brand', getByUser)
    it('should handle returned exception from google-credential by user-brand', getByUserFailed)

    it('should return a google-credential by id', getById)
    it('should handle returned exception from google-credential by id', getByIdFailed)
    
    it('should update a google-credential tokens', updateTokens)
    it('should update a google-credential refresh-token', updateRefreshToken)
    it('should update a google-credential access-token', updateAccesshToken)
    it('should revoke a google-credential', updateAsRevoked)
    it('should update a google-credential last sync time', updateLastSync)
    it('should update a google-credential sync status', updateSyncStatus)
    
    it('should disable/enable a google-credential', disableEnableSync)
    it('should handle returned exception from disable/enable google-credential', disableEnableSyncFailed)
    it('should handle disabling a revoked account', disableRevokedAccountFailed)
    
    it('should handle force sync request', forceSync)
    it('should update a google-credential profile', updateProfile)
    it('should update a google-credential gmail-profile', updateGmailProfile)
    it('should update a google-credential contact_last_sync_At', updateContactsLastSyncAt)
    it('should update a google-credential messages sync token', updateMessagesSyncHistoryId)
    it('should update a google-credential threads sync token', updateThreadsSyncHistoryId)
  })
})