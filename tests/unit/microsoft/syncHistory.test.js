const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context              = require('../../../lib/models/Context')
const User                 = require('../../../lib/models/User')
const BrandHelper          = require('../brand/helper')
const MicrosoftSyncHistory = require('../../../lib/models/Microsoft/sync_history')

const { createMicrosoftCredential } = require('./helper')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function addSyncHistory() {
  const { credential } = await createMicrosoftCredential(user, brand)

  const historyId = await MicrosoftSyncHistory.addSyncHistory({
    user: credential.user,
    brand: credential.brand,
    microsoft_credential: credential.id,

    extract_contacts_error: 'error',

    synced_contacts_num: 104,
    contacts_total: 105,

    sync_messages_error: 'error',

    synced_messages_num: 100,
    messages_total: 101,

    sync_duration: 106,

    status: true
  })
  
  const history = await MicrosoftSyncHistory.getSyncHistory(historyId)

  expect(history.type).to.be.equal('microsoft_sync_history')
  expect(history.microsoft_credential).to.be.equal(credential.id)
  expect(history.user).to.be.equal(credential.user)
  expect(history.synced_messages_num).to.be.equal(100)
  expect(history.sync_duration).to.be.equal(106)
  expect(history.extract_contacts_error).to.be.equal('error')

  return history
}

async function getSyncHistoryFailed() {  
  try {
    await MicrosoftSyncHistory.getSyncHistory(user.id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`Microsoft-SyncHistory ${user.id} not found`)
  }
}

async function getMCredentialLastSyncHistory() {
  const { credential } = await createMicrosoftCredential(user, brand)
  const histroy        = await addSyncHistory()

  const restult = await MicrosoftSyncHistory.getMCredentialLastSyncHistory(histroy.user, histroy.brand, histroy.microsoft_credential)

  expect(restult.type).to.be.equal('microsoft_sync_history')
  expect(restult.microsoft_credential).to.be.equal(credential.id)
  expect(restult.user).to.be.equal(credential.user)
  expect(restult.synced_messages_num).to.be.equal(100)
  expect(restult.sync_duration).to.be.equal(106)
}

async function getMCredentialLastSyncHistoryFailed() {
  try {
    await MicrosoftSyncHistory.getMCredentialLastSyncHistory(user.id, user.id, user.id)
  } catch (ex) {
    expect(ex.message).to.be.equal(`Microsoft-SyncHistory for M-Credential ${user.id} not found`)
  }
}



describe('Microsoft', () => {
  describe('Microsoft Sync History', () => {
    createContext()
    beforeEach(setup)

    it('should create a microsoft sync history', addSyncHistory)
    it('should handle failed get sync history', getSyncHistoryFailed)
    it('should return last history of a specific microsoft credential', getMCredentialLastSyncHistory)
    it('should handle failed get last history of a specific microsoft credential', getMCredentialLastSyncHistoryFailed)
  })
})