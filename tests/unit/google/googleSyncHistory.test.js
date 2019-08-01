const { expect } = require('chai')
const { createContext } = require('../helper')

const Context           = require('../../../lib/models/Context')
const User              = require('../../../lib/models/User')
const BrandHelper       = require('../brand/helper')
const GoogleCredential  = require('../../../lib/models/Google/credential')
const GoogleSyncHistory = require('../../../lib/models/Google/sync_history')


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

async function addSyncHistory() {
  const credential = await createGoogleCredential()

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

async function getGCredentialLastSyncHistory() {
  const credential = await createGoogleCredential()
  const histroy    = await addSyncHistory()

  const restult = await GoogleSyncHistory.getGCredentialLastSyncHistory(histroy.user, histroy.brand, histroy.google_credential)

  expect(restult.type).to.be.equal('google_sync_history')
  expect(restult.google_credential).to.be.equal(credential.id)
  expect(restult.user).to.be.equal(credential.user)
  expect(restult.synced_messages_num).to.be.equal(100)
  expect(restult.sync_duration).to.be.equal(106)
}



describe('Google', () => {
  describe('Google Sync History', () => {
    createContext()
    beforeEach(setup)

    it('should create a google sync history', addSyncHistory)
    it('should return last history of a specific google credential', getGCredentialLastSyncHistory)
  })
})