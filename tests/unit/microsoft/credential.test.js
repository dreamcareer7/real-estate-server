const { expect }        = require('chai')
const { createContext, handleJobs } = require('../helper')

const Context             = require('../../../lib/models/Context')
const User                = require('../../../lib/models/User/get')
const BrandHelper         = require('../brand/helper')
const { removeMember }    = require('../../../lib/models/Brand/role/members')
const MicrosoftCredential = require('../../../lib/models/Microsoft/credential')

const { createMicrosoftCredential } = require('./helper')


let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function create() {
  const { credential, body } = await createMicrosoftCredential(user, brand)

  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.email)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function findByUserBrand() {
  const createdCredential = await create()
  const credentialIds     = await MicrosoftCredential.findByUserBrand(createdCredential.user, createdCredential.brand)

  expect(credentialIds).not.to.be.equal(0)
}

async function getByBrand() {
  const createdCredential = await create()
  const credentials       = await MicrosoftCredential.getByBrand(createdCredential.brand)

  expect(credentials.length).not.to.be.equal(0)

  for (const record of credentials) {

    expect(record.user).to.be.equal(createdCredential.user)
    expect(record.brand).to.be.equal(createdCredential.brand)
  }
}

async function getByUser() {
  const createdCredential = await create()
  const credentials       = await MicrosoftCredential.getByUser(createdCredential.user, createdCredential.brand)

  expect(credentials.length).not.to.be.equal(0)

  for (const record of credentials) {

    expect(record.user).to.be.equal(createdCredential.user)
    expect(record.brand).to.be.equal(createdCredential.brand)
  }
}

async function getByUserFailed() {
  const credentials = await MicrosoftCredential.getByUser(user.id, user.id)

  expect(credentials.length).to.be.equal(0)
}

async function getById() {
  const createdCredential = await create()
  const credential        = await MicrosoftCredential.get(createdCredential.id)

  expect(credential.user).to.be.equal(createdCredential.user)
  expect(credential.brand).to.be.equal(createdCredential.brand)
}

async function getByIdFailed() {
  try {
    const not_exist_credential_id = user.id
    await MicrosoftCredential.get(not_exist_credential_id)

  } catch (ex) {
    const message = `Microsoft-Credential ${user.id} not found`

    expect(ex.message).to.be.equal(message)
  }
}

async function updateTokens() {
  const createdCredential = await create()

  const tokens = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    id_token: 'id_token',
    expires_in: 0,
    ext_expires_in: 0
  }

  await MicrosoftCredential.updateTokens(createdCredential.id, tokens)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.access_token).to.be.equal(tokens.access_token)
}

async function updateSendEmailAfter() {
  const createdCredential = await create()

  const ts = new Date().getTime()

  await MicrosoftCredential.updateSendEmailAfter(createdCredential.id, ts)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(Number(updatedCredential.send_email_after)).to.be.equal(ts)
}

async function disconnect() {
  const createdCredential = await create()

  await MicrosoftCredential.disconnect(createdCredential.id)
  const updatedCredential_1 = await MicrosoftCredential.get(createdCredential.id)
  expect(updatedCredential_1.deleted_at).not.to.be.equal(null)
}

async function disconnectFailed() {
  const not_exist_credential_id = user.id

  try {
    await MicrosoftCredential.disconnect(not_exist_credential_id)

  } catch (ex) {
    const message = `Microsoft-Credential ${user.id} not found`

    expect(ex.message).to.be.equal(message)
  }
}

async function revoke() {
  const createdCredential = await create()

  await MicrosoftCredential.revoke(createdCredential.id)
  const updatedCredential_1 = await MicrosoftCredential.get(createdCredential.id)
  expect(updatedCredential_1.revoked).to.be.equal(true)
}

async function disconnectOnLeavingWithMultipleRole() {
  brand = await BrandHelper.create({
    roles: { Admin: [user.id], Marketing: [user.id] },
    contexts: [],
    checklists: []
  })
  Context.set({ user, brand })

  const { credential } = await createMicrosoftCredential(user, brand)
  await removeMember(brand.roles[0], user.id)

  await handleJobs()

  const theCredential = await MicrosoftCredential.get(credential.id)
  expect(theCredential.revoked).to.be.equal(false)
}

async function disconnectOnLeavingWithSingleRole() {
  const { credential } = await createMicrosoftCredential(user, brand)
  await removeMember(brand.roles[0], user.id)

  await handleJobs()

  const theCredential = await MicrosoftCredential.get(credential.id)
  expect(theCredential.revoked).to.be.equal(true)
}

async function updateProfile() {
  const createdCredential = await create()

  const profile = {
    displayName: 'displayName',
    givenName: 'givenName',
    surname: 'surname',
    photo: 'http://....'
  }
  await MicrosoftCredential.updateProfile(createdCredential.id, profile)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.display_name).to.be.equal(profile.displayName)
}

async function updatePrimaryEmail() {
  const createdCredential = await create()

  const email = 'new-email@outlook.com'

  await MicrosoftCredential.updatePrimaryEmail(createdCredential.id, email)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.email).to.be.equal(email)
}

async function updateRechatMicrosoftCalendar() {
  const createdCredential = await create()

  const rechatCalendarId = null

  await MicrosoftCredential.updateRechatMicrosoftCalendar(createdCredential.id, rechatCalendarId)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.microsoft_calendar).to.be.equal(rechatCalendarId)
}

async function resetRechatMicrosoftCalendar() {
  const createdCredential = await create()

  await MicrosoftCredential.resetRechatMicrosoftCalendar(createdCredential.id)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.microsoft_calendar).to.be.equal(null)
}

async function hasSendEmailAccess() {
  const createdCredential = await create()
  const credential = await MicrosoftCredential.hasSendEmailAccess(createdCredential.id)

  expect(credential.id).to.be.equal(createdCredential.id)
}

async function updateContactFoldersSyncToken() {
  const createdCredential = await create()

  const token = 'token'

  await MicrosoftCredential.updateContactFoldersSyncToken(createdCredential.id, token)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.cfolders_sync_token).to.be.equal(token)
}

async function updateContactsSyncToken() {
  const createdCredential = await create()

  const token = 'token'

  await MicrosoftCredential.updateContactsSyncToken(createdCredential.id, token)

  const updatedCredential = await MicrosoftCredential.get(createdCredential.id)

  expect(createdCredential.id).to.be.equal(updatedCredential.id)
  expect(updatedCredential.contacts_sync_token).to.be.equal(token)
}



describe('Microsoft', () => {
  describe('Microsoft Account', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft credential', create)
    it('should return microsoft-credential ids by user-brand', findByUserBrand)
    it('should return a microsoft credential by brand', getByBrand)
    it('should return a microsoft credential by user-brand', getByUser)
    it('should handle returned exception from microsoft-credential by user-brand', getByUserFailed)

    it('should return a microsoft credential by id', getById)
    it('should handle returned exception from microsoft-credential by id', getByIdFailed)
    
    it('should update microsoft-credential\'s tokens', updateTokens)
    it('should update microsoft-credential\'s send_email_after', updateSendEmailAfter)

    it('should disable/enable a microsoft-credential', disconnect)
    it('should handle returned exception from disable/enable microsoft-credential', disconnectFailed)
    it('should revoke a microsoft-credential', revoke)
    it('should revoke a microsoft-credential on leaving brand with a multiple role', disconnectOnLeavingWithMultipleRole)
    it('should revoke a microsoft-credential on leaving brand with a single role', disconnectOnLeavingWithSingleRole)

    it('should update microsoft-credential\'s profile', updateProfile)
    it('should update microsoft-credential\'s primary email address', updatePrimaryEmail)

    it('should update microsoft-credential\'s rechat-microsoft-Calendar', updateRechatMicrosoftCalendar)
    it('should update google-credential\'s rechat-google-Calendar as null', resetRechatMicrosoftCalendar)
    it('should check the access of sending emails', hasSendEmailAccess)

    it('should update microsoft-credential\'s cfolders_sync_token', updateContactFoldersSyncToken)
    it('should update microsoft-credential\'s contacts_sync_token', updateContactsSyncToken)
  })
})