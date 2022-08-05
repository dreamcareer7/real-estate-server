const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User/get')
const BrandHelper      = require('../brand/helper')
const { removeMember } = require('../../../lib/models/Brand/role/members')
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

  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.emailAddress)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function findByUserBrand() {
  const createdCredential = await create()
  const credentialIds     = await GoogleCredential.findByUserBrand(createdCredential.user, createdCredential.brand)

  expect(credentialIds).not.to.be.equal(0)
}

async function getByBrand() {
  const createdCredential = await create()
  const credentials       = await GoogleCredential.getByBrand(createdCredential.brand)

  expect(credentials.length).not.to.be.equal(0)

  for (const record of credentials) {
    expect(record.user).to.be.equal(createdCredential.user)
    expect(record.brand).to.be.equal(createdCredential.brand)
  }
}

async function getByUser() {
  const createdCredential = await create()
  const credentials       = await GoogleCredential.getByUser(createdCredential.user, createdCredential.brand)

  expect(credentials.length).not.to.be.equal(0)

  for (const record of credentials) {
    expect(record.user).to.be.equal(createdCredential.user)
    expect(record.brand).to.be.equal(createdCredential.brand)
  }
}

async function getByEmail() {
  const createdCredential = await create()
  const credentials       = await GoogleCredential.getByEmail(createdCredential.email)

  expect(credentials.length).to.be.equal(1)

  for (const record of credentials) {
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

async function updateLastDailySync() {
  const createdCredential = await create()
  expect(createdCredential.revoked).to.be.equal(false)

  await GoogleCredential.updateLastDailySync(createdCredential.id)
  const updatedCredential = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential.last_daily_sync).to.not.be.equal(createdCredential.last_daily_sync)
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

async function revoke() {
  const createdCredential = await create()

  await GoogleCredential.revoke(createdCredential.id)
  const updatedCredential_1 = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential_1.revoked).to.be.equal(true)
}

async function disconnectOnLeavingWithMultipleRole() {
  brand = await BrandHelper.create({
    roles: { Admin: [user.id], Marketing: [user.id] },
    contexts: [],
    checklists: []
  })
  Context.set({ user, brand })

  const { credential } = await createGoogleCredential(user, brand)
  await removeMember(brand.roles[0], user.id)

  await handleJobs()

  const theCredential = await GoogleCredential.get(credential.id)
  expect(theCredential.revoked).to.be.equal(false)
}

async function disconnectOnLeavingWithSingleRole() {
  const { credential } = await createGoogleCredential(user, brand)
  await removeMember(brand.roles[0], user.id)

  await handleJobs()

  const theCredential = await GoogleCredential.get(credential.id)
  expect(theCredential.revoked).to.be.equal(true)
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

async function updateContactGroupsSyncToken() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateContactGroupsSyncToken(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.cgroups_sync_token).to.be.equal(syncToken)
}

async function updateContactsSyncToken() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateContactsSyncToken(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.contacts_sync_token).to.be.equal(syncToken)
}

async function updateOtherContactsSyncToken() {
  const createdCredential = await create()

  const syncToken = 'syncToken'
  await GoogleCredential.updateOtherContactsSyncToken(createdCredential.id, syncToken)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.other_contacts_sync_token).to.be.equal(syncToken)
}

async function updateMessagesSyncHistoryIdWithThirdParam() {
  const createdCredential = await create()

  const historyId   = 123456
  const watcher_exp = new Date().getTime()
  await GoogleCredential.updateMessagesSyncHistoryId(createdCredential.id, historyId, watcher_exp)

  const updatedCredential = await GoogleCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(Number(updatedCredential.messages_sync_history_id)).to.be.equal(historyId)
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

async function resetRechatGoogleCalendar() {
  const createdCredential = await create()
  expect(createdCredential.revoked).to.be.equal(false)

  await GoogleCredential.resetRechatGoogleCalendar(createdCredential.id)
  const updatedCredential = await GoogleCredential.get(createdCredential.id)
  expect(updatedCredential.google_calendar).to.be.equal(null)
}

async function hasSendEmailAccess() {
  const createdCredential = await create()
  const credential = await GoogleCredential.hasSendEmailAccess(createdCredential.id)

  expect(credential.id).to.be.equal(createdCredential.id)
}


describe('Google', () => {
  describe('Google Account', () => {
    createContext()
    beforeEach(setup)

    it('should create a google-credential', create)
    it('should return google-credential ids by user-brand', findByUserBrand)
    it('should return a google-credential by brand', getByBrand)
    it('should return a google-credential by user-brand', getByUser)
    it('should return a google-credential by email', getByEmail)
    it('should handle returned exception from google-credential by user-brand', getByUserFailed)

    it('should return a google-credential by id', getById)
    it('should handle returned exception from google-credential by id', getByIdFailed)
    
    it('should update google-credential\'s tokens', updateTokens)
    it('should update google-credential\'s refresh-token', updateRefreshToken)
    it('should update google-credential\'s access-token', updateAccesshToken)
    it('should update google-credential LastDailySync', updateLastDailySync)
    
    it('should disconnect a google-credential', disconnect)
    it('should handle returned exception from disconnect google-credential', disconnectFailed)
    it('should revoke a google-credential', revoke)
    it('should revoke a google-credential on leaving brand with a multiple role', disconnectOnLeavingWithMultipleRole)
    it('should revoke a google-credential on leaving brand with a single role', disconnectOnLeavingWithSingleRole)
    
    it('should update google-credential\'s profile', updateProfile)
    it('should update google-credential\'s gmail-profile', updateGmailProfile)
    it('should update google-credential\'s messages sync_token', updateMessagesSyncHistoryId)
    it('should update google-credential\'s messages sync_token', updateMessagesSyncHistoryIdWithThirdParam)
    it('should update google-credential\'s contact groups sync_token', updateContactGroupsSyncToken)
    it('should update google-credential\'s contacts sync_token', updateContactsSyncToken)
    it('should update google-credential\'s other contacts sync_token', updateOtherContactsSyncToken)

    it('should update google-credential\'s rechat-google-Calendar', updateRechatGoogleCalendar)
    it('should update google-credential\'s rechat-google-Calendar as null', resetRechatGoogleCalendar)
    it('should check the access of sending emails', hasSendEmailAccess)
  })
})