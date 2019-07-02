/*
// @ts-nocheck
const { expect } = require('chai')
const { createContext, handleJobs } = require('../helper')

const Context     = require('../../../lib/models/Context')
const User        = require('../../../lib/models/User')
const BrandHelper = require('../brand/helper')

const GoogleCredential = require('../../../lib/models/Google/credential')
const GoogleWorkers    = require('../../../lib/models/Google/workers')
const GoogleAuthLink = require('../../../lib/models/Google/auth_link')
const GoogleContact  = require('../../../lib/models/Google/contact')
const GoogleMessage  = require('../../../lib/models/Google/message')


let user, brand

const google_details = {
  address_1: 'saeed.uni68@gmail.com',
  tokens_1: {
    'access_token': 'ya29.GlsSB5gTTkynEx16V7EnNexoVj15uo5277RNLpoGQXHuqn3UAAQ_iRZ1x7V5dzd--90eCb0Kr5F0UwMiPemjJpK2SeU24P7hxLivNitL4yJX6uOaaYM_ObY65EF9',
    'refresh_token': '1/mvS9GZgOmJrvcRpDBsWgY0ixn2GOW0kDSHMs9LxhpTA',
    'scope': 'https://www.googleapis.com/auth/contacts.readonly',
    'token_type': 'Bearer',
    'expiry_date': 1558581374000
  },
  
  address_2: 'saeed@rechat.com',
  tokens_2: {
    'access_token': 'ya29.GlsUBzA2jx8dx_keCJver96nMm-eAEUHHO-olVoNyuHAdNcCeVZTHGu8gskwbz5lJKiYCX2XTX8nvBIg-FaFGMWyAkD0rPqKt3Z-6lwwOtU-rLcjEzzufD1yS8q4',
    'refresh_token': '1/wf3VTMwGFDqnDwA9yVvz8OVLUro8iKTcvoCoXo7Pa6pajnviTBgD2gdqQQtiIeYi',
    'token_type': 'Bearer',
    'scope': 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly',
    'expiry_date': '2019-05-25T12:57:06.449Z'
  }
}

const google_auth_json   = require('./data/google_auth.json')
const gmail_profile_json = require('./data/gmail_profile.json')



async function setup() {
  user  = await User.getByEmail('test@rechat.com')
  brand = await BrandHelper.create({ roles: { Admin: [user.id] } })

  Context.set({ user, brand })
}


async function createGmail() {
  google_auth_json.user  = user.id
  google_auth_json.brand = brand.id
  google_auth_json.email = google_details.address_2

  gmail_profile_json.emailAddress = google_details.address_2

  const body = {
    gmailAuthLink: google_auth_json,
    profile: gmail_profile_json,
    tokens: google_details.tokens_2
  }

  const gmailRecordId = await GoogleCredential.create(body)
  const gmailRecord   = await GoogleCredential.get(gmailRecordId)

  expect(gmailRecord.user).to.be.equal(user.id)
  expect(gmailRecord.brand).to.be.equal(brand.id)
  expect(gmailRecord.email).to.be.equal(body.profile.emailAddress)
  expect(gmailRecord.access_token).to.be.equal(body.tokens.access_token)

  return gmailRecord
}

async function syncGoogle() {
  const googleCredential = await createGmail()

  expect(googleCredential.revoked).to.be.equal(false)

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }

  const result  = await GoogleWorkers.syncGoogle(data)
  const updated = await GoogleCredential.get(googleCredential.id)

  await handleJobs()

  expect(updated.last_sync_at.getTime()).to.be.equal(result.syncFinishTime.getTime())
  expect(google_details.address_2).to.be.equal(result.googleProfile.emailAddress)
  expect(updated.contacts_sync_token).to.be.equal(result.contactsLastSyncToken)
  expect(updated.contact_groups_sync_token).to.be.equal(result.contactGroupsLastSyncToken)
}


async function syncProfile() {
  const googleCredential = await createGmail()

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }

  const profile = await GoogleWorkers.syncGoogle(data)

  expect(profile.emailAddress).to.be.equal(google_details.address_2)
}

async function syncConnections() {
  const googleCredential = await createGmail()

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncGoogle(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contacts_sync_token).to.be.equal(syncToken)
}

async function syncConnectionsComplex() {
  const googleCredential = await createGmail()

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }
  const syncToken = await GoogleWorkers.syncGoogle(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contacts_sync_token).to.be.equal(syncToken)

  data.meta.partialSync = true
  data.googleCredential = updated
  await GoogleWorkers.syncGoogle(data)
}

async function syncContactGroups() {
  const googleCredential = await createGmail()

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncGoogle(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contact_groups_sync_token).to.be.equal(syncToken)
}

async function syncContactGroupsComplex() {
  const googleCredential = await createGmail()

  const data = {
    action: 'google_sync',
    googleCredential: googleCredential
  }

  const syncToken = await GoogleWorkers.syncGoogle(data)
  const updated   = await GoogleCredential.get(googleCredential.id)

  expect(updated.contact_groups_sync_token).to.be.equal(syncToken)

  data.meta.partialSync = true
  data.googleCredential = updated
  await GoogleWorkers.syncGoogle(data)
}

async function syncMessages() {
}

async function syncThreads() {
}



describe('Google', () => {
  describe('Google Workers', () => {
    createContext()
    beforeEach(setup)

    it('should run general google sync', syncGoogle)
    it('should run google sync profile worker', syncProfile)
    it('should run google sync connections worker', syncConnections)
    it('should run google sync connections worker', syncConnectionsComplex)
    it('should run google sync contact-groups worker', syncContactGroups)
    it('should run google sync contact-groups worker', syncContactGroupsComplex)
    it('should run google sync messages worker', syncMessages)
    it('should run google sync threads worker', syncThreads)
  })
})
*/