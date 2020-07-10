const { expect } = require('chai')
const { createContext } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const GoogleCredential = require('../../../lib/models/Google/credential')

const { createGoogleCredential } = require('./helper')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({
    roles: { Admin: [user.id] },
    contexts: [],
    checklists: []
  })

  Context.set({ user, brand })
}

async function create() {
  const { credential, body } = await createGoogleCredential(user, brand)

  expect(credential.type).to.be.equal('google_credential')
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

async function getByEmail() {
  const createdCredential = await create()
  const credentials       = await GoogleCredential.getByEmail(createdCredential.email)

  expect(credentials.length).to.be.equal(1)

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
  const TS = Math.round(new Date().getTime())

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

  await GoogleCredential.updateAccesshToken(createdCredential.id, new_access_token, new Date().getTime())

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

async function disconnect() {
  const createdCredential = await create()

  await GoogleCredential.disconnect(createdCredential.id)
  const updatedCredential_1 = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential_1.deleted_at).not.to.be.equal(null)
}

async function disconnectFailed() {
  const not_exist_credential_id = user.id

  try {
    await GoogleCredential.disconnect(not_exist_credential_id)

  } catch (ex) {
    const message = `Google-Credential ${user.id} not found`

    expect(ex.message).to.be.equal(message)
  }
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

async function updateMessagesSyncHistoryId() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateMessagesSyncHistoryId(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.messages_sync_history_id).to.be.equal(syncToken)
  expect(updatedCredential.watcher_exp).to.be.equal(null)
}

async function updateMessagesSyncHistoryIdWithThirdParam() {
  const createdCredential = await create()

  const syncToken   = 'syncToken'
  const watcher_exp = new Date().getTime()
  await GoogleCredential.updateMessagesSyncHistoryId(createdCredential.id, syncToken, watcher_exp)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.messages_sync_history_id).to.be.equal(syncToken)
  expect(Number(updatedCredential.watcher_exp)).to.be.equal(watcher_exp)
}

async function updateRechatGoogleCalendar() {
  const createdCredential = await create()

  const rechatCalendarId = null

  await GoogleCredential.updateRechatGoogleCalendar(createdCredential.id, rechatCalendarId)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.google_calendar).to.be.equal(rechatCalendarId)
}

describe('Google', () => {
  describe('Google Account', () => {
    createContext()
    beforeEach(setup)

    it('should create a google-credential', create)
    it('should publicize a google-credential', publicize)

    it('should return a google-credential by user-brand', getByUser)
    it('should return a google-credential by email', getByEmail)
    it('should handle returned exception from google-credential by user-brand', getByUserFailed)

    it('should return a google-credential by id', getById)
    it('should handle returned exception from google-credential by id', getByIdFailed)
    
    it('should update a google-credential tokens', updateTokens)
    it('should update a google-credential refresh-token', updateRefreshToken)
    it('should update a google-credential access-token', updateAccesshToken)
    it('should revoke a google-credential', updateAsRevoked)
    
    it('should disconnect a google-credential', disconnect)
    it('should handle returned exception from disconnect google-credential', disconnectFailed)
    
    it('should update a google-credential profile', updateProfile)
    it('should update a google-credential gmail-profile', updateGmailProfile)
    it('should update a google-credential messages sync token', updateMessagesSyncHistoryId)
    it('should update a google-credential messages sync token', updateMessagesSyncHistoryIdWithThirdParam)

    it('should update a google-credential rechat-google-Calendar', updateRechatGoogleCalendar)
  })
})
