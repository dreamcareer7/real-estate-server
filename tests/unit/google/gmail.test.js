const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')

const Context          = require('../../../lib/models/Context')
const User             = require('../../../lib/models/User')
const Brand            = require('../../../lib/models/Brand')
const Job              = require('../../../lib/models/Job')
const BrandHelper      = require('../brand/helper')

const GoogleAuthLink   = require('../../../lib/models/Google/auth_link')
const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleContact    = require('../../../lib/models/Google/contact')
const GoogleMessage    = require('../../../lib/models/Google/message')
const GoogleWorkers    = require('../../../lib/models/Google/workers')


let user, brand

const GOOGLE_ADDRESS_1 = 'saeed.uni68@gmail.com'
const GOOGLE_TOKENS_1  = {
  "access_token": "ya29.GlsSB5gTTkynEx16V7EnNexoVj15uo5277RNLpoGQXHuqn3UAAQ_iRZ1x7V5dzd--90eCb0Kr5F0UwMiPemjJpK2SeU24P7hxLivNitL4yJX6uOaaYM_ObY65EF9",
  "refresh_token": "1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA",
  "scope": "https://www.googleapis.com/auth/contacts.readonly",
  "token_type": "Bearer",
  "expiry_date": 1558581374000
}

const GOOGLE_ADDRESS_2 = 'saeed@rechat.com'
const GOOGLE_TOKENS_2  = {
  "access_token": "ya29.GlsUBzA2jx8dx_keCJver96nMm-eAEUHHO-olVoNyuHAdNcCeVZTHGu8gskwbz5lJKiYCX2XTX8nvBIg-FaFGMWyAkD0rPqKt3Z-6lwwOtU-rLcjEzzufD1yS8q4",
  "refresh_token": "1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi",
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly",
  "expiry_date": "2019-05-25T12:57:06.449Z"
}


const google_tokens_json = require('./data/google_tokens.json')
const google_auth_json   = require('./data/google_auth.json')
const gmail_profile_json = require('./data/gmail_profile.json')




async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}

async function requestGmailAccess() {
  const authLinkRecord = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, GOOGLE_ADDRESS_1)
  
  expect(authLinkRecord.url).to.be.not.null

  return authLinkRecord
}

async function duplicateRequestGmailAccess() {
  const authUrl_1 = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, GOOGLE_ADDRESS_1)
  const authUrl_2 = await GoogleAuthLink.requestGmailAccess(user.id, brand.id, GOOGLE_ADDRESS_1)
  
  expect(authUrl_1).to.be.not.null
  expect(authUrl_2).to.be.not.null
  expect(authUrl_2).to.be.equal(authUrl_2)
}

async function getByLink() {
  const authLinkRecord = await requestGmailAccess()
  const gmailAuthLink  = await GoogleAuthLink.getByLink(authLinkRecord.url)
  
  expect(authLinkRecord.url).to.be.equal(gmailAuthLink.url)
}

async function getByUser() {
  await requestGmailAccess()
  const gmailAuthLink = await GoogleAuthLink.getByUser(user.id, brand.id)

  expect(gmailAuthLink.user).to.be.equal(user.id)
  expect(gmailAuthLink.brand).to.be.equal(brand.id)
}

async function getByKey() {
  const authLinkRecord = await requestGmailAccess()
  const record         = await GoogleAuthLink.getByLink(authLinkRecord.url)
  const sameRecord     = await GoogleAuthLink.getByUser(user.id, brand.id)
  
  expect(record.key).to.be.equal(sameRecord.key)
}


async function createGmail() {
  google_auth_json.user  = user.id
  google_auth_json.brand = brand.id
  google_auth_json.email = GOOGLE_ADDRESS_2

  gmail_profile_json.emailAddress = GOOGLE_ADDRESS_2

  const body = {
    gmailAuthLink: google_auth_json,
    profile: gmail_profile_json,
    tokens: GOOGLE_TOKENS_2
  }

  const gmailRecordId = await GoogleCredential.create(body)
  const gmailRecord   = await GoogleCredential.get(gmailRecordId)

  expect(gmailRecord.user).to.be.equal(user.id)
  expect(gmailRecord.brand).to.be.equal(brand.id)
  expect(gmailRecord.email).to.be.equal(body.profile.emailAddress)
  expect(gmailRecord.access_token).to.be.equal(body.tokens.access_token)

  return gmailRecord
}

async function getGmailByUser() {
  const createdGmail = await createGmail()
  const gmailRecord  = await GoogleCredential.getByUser(createdGmail.user, createdGmail.brand)

  expect(createdGmail.user).to.be.equal(gmailRecord.user)
  expect(createdGmail.brand).to.be.equal(gmailRecord.brand)
  expect(createdGmail.email).to.be.equal(gmailRecord.email)
}

async function getGmailByEmail() {
  const createdGmail = await createGmail()
  const gmailRecord  = await GoogleCredential.getByEmail(createdGmail.email)

  expect(createdGmail.email).to.be.equal(gmailRecord.email)
}

async function updateGmailTokens() {
  const createdGmail = await createGmail()
  const TS = new Date()

  const tokens = {
    access_token: 'new-access-token',
    refresh_token: 'new-refresh-token',
    expiry_date: TS
  }
  await GoogleCredential.updateTokens(createdGmail.id, tokens)

  const updatedGmail = await GoogleCredential.get(createdGmail.id)

  expect(createdGmail.id).to.be.equal(updatedGmail.id)
  expect(updatedGmail.access_token).to.be.equal(tokens.access_token)
}

async function updateGmailAsRevoked() {
  const createdGmail = await createGmail()
  expect(createdGmail.revoked).to.be.equal(false)

  await GoogleCredential.updateAsRevoked(createdGmail.user, createdGmail.brand)
  const updatedGmail = await GoogleCredential.get(createdGmail.id)
  expect(updatedGmail.revoked).to.be.equal(true)
}

async function updateGmailProfile() {
  const createdGmail = await createGmail()

  const profile = {
    messagesTotal: 100,
    threadsTotal: 15,
    historyId: 1410
  }
  await GoogleCredential.updateProfile(createdGmail.id, profile)

  const updatedGmail = await GoogleCredential.get(createdGmail.id)

  expect(createdGmail.id).to.be.equal(updatedGmail.id)
  expect(updatedGmail.messages_total).to.be.equal(profile.messagesTotal)
}



async function syncProfile() {
  const googleCredential = await createGmail()

  const data = {
    meta: {
      firstSync: true,
      action: 'sync_profile'
    },
    googleCredential: googleCredential
  }

  const profile = await GoogleWorkers.syncProfile(data)

  expect(profile.emailAddress).to.be.equal(GOOGLE_ADDRESS_2)
}

async function syncConnections() {
  const googleCredential = await createGmail()

  const data = {
    meta: {
      partialSync: false,
      action: 'sync_contacts'
    },
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncContacts(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contacts_sync_token).to.be.equal(syncToken)
}

async function syncConnectionsComplex() {
  const googleCredential = await createGmail()

  const data = {
    meta: {
      partialSync: false,
      action: 'sync_contacts'
    },
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncContacts(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contacts_sync_token).to.be.equal(syncToken)

  data.meta.partialSync = true
  data.googleCredential = updated
  await GoogleWorkers.syncContacts(data)
}

async function syncContactGroups() {
  const googleCredential = await createGmail()

  const data = {
    meta: {
      partialSync: false,
      action: 'sync_contact_groups'
    },
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncContactGroups(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contact_groups_sync_token).to.be.equal(syncToken)
}

async function syncContactGroupsComplex() {
  const googleCredential = await createGmail()

  const data = {
    meta: {
      partialSync: false,
      action: 'sync_contact_groups'
    },
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncContactGroups(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contact_groups_sync_token).to.be.equal(syncToken)

  data.meta.partialSync = true
  data.googleCredential = updated
  await GoogleWorkers.syncContactGroups(data)
}

async function syncMessages() {
  const gmail       = await createGmail()
  const connections = await GoogleMessage.syncMessages(gmail.user, gmail.brand)
  // expect(connections.xxx).to.be.equal(xxxx)
}


describe('Google', () => {
  // describe('Google Auth Link', () => {
  //   createContext()
  //   beforeEach(setup)

  //   it('should create a google auth link', requestGmailAccess)
  //   it('should handle duplicate create-google-auth-link request', duplicateRequestGmailAccess)
  //   it('should return auth-link record by link', getByLink)
  //   it('should return auth-link record by user', getByUser)
  //   it('should return auth-link record by key', getByKey)
  // })

  // describe('Google Account', () => {
  //   createContext()
  //   beforeEach(setup)

    // it('should create a gmail record (semi-grant-access)', createGmail)
    // it('should return a gmail record by user', getGmailByUser)
    // it('should return a gmail record by email', getGmailByEmail)
    // it('should update a gmail record tokens', updateGmailTokens)
    // it('should revoke a gmail record', updateGmailAsRevoked)
    // it('should update a gmail record profile', updateGmailProfile)
  // })

  describe('Google Workers', () => {
    createContext()
    beforeEach(setup)

    // it('should run goole sync profile worker', syncProfile)
    // it('should run goole sync connections worker', syncConnections)
    it('should run goole sync contact-groups worker', syncContactGroups)
    // it('should run goole sync messages worker', syncMessages)
  })
})