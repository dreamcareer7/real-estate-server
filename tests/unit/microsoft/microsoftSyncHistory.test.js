const { expect }        = require('chai')
const { createContext } = require('../helper')

const Context              = require('../../../lib/models/Context')
const User                 = require('../../../lib/models/User')
const BrandHelper          = require('../brand/helper')
const MicrosoftCredential  = require('../../../lib/models/Microsoft/credential')
const MicrosoftSyncHistory = require('../../../lib/models/Microsoft/sync_history')


let user, brand

const microsoft_details = {
  address_1: 'rechat-test@outlook.com',
  tokens_1: {
    access_token: 'GlsSB5gTTkynEx16V7EnNexoVj15u.....',
    refresh_token: 'OmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  },

  address_2: 'rechat-test-2@outlook.com',
  tokens_2: {
    access_token: 'GlsUBzA2jx8dx_keCJver96nMm.....',
    refresh_token: 'A9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    id_token: 'xxxxxxxxxxxxxxxxxxxx',
    expires_in: new Date().getTime(),
    ext_expires_in: new Date().getTime(),
    scope: 'openid offline_access profile email User.Read Contacts.Read Mail.Read'
  },
}


async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function createMicrosoftCredential() {
  const body = {
    user: user.id,
    brand: brand.id,

    profile: {
      email: 'rechat-test@outlook.com',
      remote_id: '432ea353e4efa7f6',
      displayName: 'Saeed Vayghani',
      firstName: 'Saeed',
      lastName: 'Vayghani',
      photo: 'https://outlook.com/...'  
    },

    tokens: microsoft_details.tokens_1,

    scope: microsoft_details.tokens_1.scope.split(' '),
    scopeSummary: []
  }

  const credentialId = await MicrosoftCredential.create(body)
  const credential   = await MicrosoftCredential.get(credentialId)

  expect(credential.type).to.be.equal('microsoft_credential')
  expect(credential.user).to.be.equal(user.id)
  expect(credential.brand).to.be.equal(brand.id)
  expect(credential.email).to.be.equal(body.profile.email)
  expect(credential.access_token).to.be.equal(body.tokens.access_token)

  return credential
}

async function addSyncHistory() {
  const credential = await createMicrosoftCredential()

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
  const credential = await createMicrosoftCredential()
  const histroy    = await addSyncHistory()

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