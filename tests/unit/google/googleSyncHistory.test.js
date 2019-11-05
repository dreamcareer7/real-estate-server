const { expect } = require('chai')
const { createContext } = require('../helper')

const Context           = require('../../../lib/models/Context')
const User              = require('../../../lib/models/User')
const BrandHelper       = require('../brand/helper')
const GoogleSyncHistory = require('../../../lib/models/Google/sync_history')

const { createGoogleMessages } = require('./helper')

let user, brand


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function addSyncHistory() {
  const { credential } = await createGoogleMessages(user, brand)

  const historyId = await GoogleSyncHistory.addSyncHistory({
    user: credential.user,
    brand: credential.brand,
    google_credential: credential.id,

    synced_messages_num: 100,
    messages_total: 101,
    synced_threads_num: 102,
    threads_total: 103,
    synced_contacts_num: 104,
    contacts_total: 105,
    sync_duration: 106,

    status: true
  })
  
  const history = await GoogleSyncHistory.getSyncHistory(historyId)

  expect(history.type).to.be.equal('google_sync_history')
  expect(history.google_credential).to.be.equal(credential.id)
  expect(history.user).to.be.equal(credential.user)
  expect(history.synced_messages_num).to.be.equal(100)
  expect(history.sync_duration).to.be.equal(106)

  return history
}

async function getSyncHistoryFailed() {  
  try {
    await GoogleSyncHistory.getSyncHistory(user.id)
  } catch(ex) {
    expect(ex.message).to.be.equal(`Google-SyncHistory ${user.id} not found`)
  }
}

async function getGCredentialLastSyncHistory() {
  const { credential } = await createGoogleMessages(user, brand)
  const histroy        = await addSyncHistory()

  const restult = await GoogleSyncHistory.getGCredentialLastSyncHistory(histroy.user, histroy.brand, histroy.google_credential)

  expect(restult.type).to.be.equal('google_sync_history')
  expect(restult.google_credential).to.be.equal(credential.id)
  expect(restult.user).to.be.equal(credential.user)
  expect(restult.synced_messages_num).to.be.equal(100)
  expect(restult.sync_duration).to.be.equal(106)
}

async function getGCredentialLastSyncHistoryFailed() {
  try {
    await GoogleSyncHistory.getGCredentialLastSyncHistory(user.id, user.id, user.id)
  } catch (ex) {
    expect(ex.message).to.be.equal(`Google-SyncHistory for G-Credential ${user.id} not found`)
  }
}



describe('Google', () => {
  describe('Google Sync History', () => {
    createContext()
    beforeEach(setup)

    it('should create a google sync history', addSyncHistory)
    it('should handle failed get sync history', getSyncHistoryFailed)
    it('should return last history of a specific google credential', getGCredentialLastSyncHistory)
    it('should handle failed get last history of a specific google credential', getGCredentialLastSyncHistoryFailed)
  })
})