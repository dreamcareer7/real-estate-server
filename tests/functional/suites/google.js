const uuid = require('uuid')

const google_auth_link_json   = require('./expected_objects/google/auth_link.js')
const google_credential_json  = require('./expected_objects/google/credential.js')
// const google_profile_json  = require('./expected_objects/google/profile.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])



function requestGmailAccess(cb) {
  return frisby.create('Request Google auhoriziation link')
    .post('/users/self/google', {
      redirect: 'http://localhost:3078/dashboard/contacts/',
      body: ['contacts.readonly']
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: google_auth_link_json
    })
}

function grantAccessWithMissedCode(cb) {
  const code  = ''
  const state = 'user::brand::redirect'
  const scope = 'contacts.readonly'
  const query = `?code=${code}&state=${state}&scope=${scope}`

  return frisby.create('Failed grant-access cause of missed code')
    .get(`/webhook/google/grant${query}`)
    .after(cb)
    .expectStatus(400)
}

function grantAccessWithMissedState(cb) {
  const code  = 'xxx'
  const state = ''
  const scope = 'contacts.readonly'
  const query = `?code=${code}&state=${state}&scope=${scope}`

  return frisby.create('Failed grant-access cause of missed state')
    .get(`/webhook/google/grant${query}`)
    .after(cb)
    .expectStatus(400)
}

function grantAccessWithMissedScope(cb) {
  const code  = 'xxx'
  const state = 'user::brand::redirect'
  const scope = ''
  const query = `?code=${code}&state=${state}&scope=${scope}`

  return frisby.create('Failed grant-access cause of missed scope')
    .get(`/webhook/google/grant${query}`)
    .after(cb)
    .expectStatus(400)
}

function deleteAccountFailed(cb) {
  return frisby.create('deleteAccount Failed')
    .delete(`/users/self/google/${results.authorize.token.data.id}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function forceSyncFailed(cb) {
  return frisby.create('forceSync Failed')
    .post(`/users/self/google/${results.authorize.token.data.id}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function createGoogleCredential(cb) {
  const scope = [
    'profile', 'email', 
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar'
  ]

  const scopeSummary = []

  if ( scope.includes('profile') )
    scopeSummary.push('profile')

  if ( scope.includes('https://www.googleapis.com/auth/contacts.readonly') )
    scopeSummary.push('contacts.read')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.readonly') )
    scopeSummary.push('mail.read')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.send') )
    scopeSummary.push('mail.send')

  if ( scope.includes('https://www.googleapis.com/auth/gmail.modify') )
    scopeSummary.push('mail.modify')

  if ( scope.includes('https://www.googleapis.com/auth/calendar') )
    scopeSummary.push('calendar')

  const body  = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,

    profile: {
      resourceName: 'resourceName',
      displayName: 'displayName',
      firstName: 'firstName',
      lastName: 'lastName',
      photo: 'photo',
      emailAddress: 'emailAddress',
      messagesTotal: 100,
      threadsTotal: 101,
      historyId: 103
    },

    tokens: {
      access_token: 'access_token',
      refresh_token: 'refresh_token',
      expiry_date: 3600,
      scope: scope
    },
    scope: scope,
    scopeSummary: scopeSummary
  }

  return frisby.create('Create GoogleCredential')
    .post('/jobs', {
      name: 'GoogleCredential.create',
      data: body
    })
    .after(function(err, res, credentialId) {
      cb(err, res, credentialId)
    })
    .expectStatus(200)
}

function addGoogleSyncHistory(cb) {
  const body  = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,
    google_credential: results.google.createGoogleCredential,
    synced_messages_num: 1,
    messages_total: 2,
    synced_threads_num: 3,
    threads_total: 4,
    synced_contacts_num: 5,
    contacts_total: 6,
    sync_duration: 7,
    status: true
  }

  return frisby.create('add GoogleSyncHistory')
    .post('/jobs', {
      name: 'GoogleSyncHistory.addSyncHistory',
      data: body
    })
    .after(function(err, res, syncHistory) {
      cb(err, res, syncHistory)
    })
    .expectStatus(200)
}

function getGoogleProfile(cb) {
  return frisby.create('Get Google profiles')
    .get(`/users/self/google/${results.google.createGoogleCredential}?associations=google_credential.histories`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: google_credential_json
    })
}

function getGoogleProfiles(cb) {
  return frisby.create('Get Google profiles')
    .get('/users/self/google?associations=google_credential.histories')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [google_credential_json]
    })
}

function forceSync(cb) {
  return frisby.create('force sync')
    .post(`/users/self/google/${results.google.createGoogleCredential}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
}

function deleteAccount(cb) {
  return frisby.create('Delete Google account')
    .delete(`/users/self/google/${results.google.createGoogleCredential}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: google_credential_json
    })
}

function deleteAccountFailedCauseOfInvalidBrand(cb) {
  const invalidBrandId = uuid.v4()

  return frisby.create('deleteAccount failed Cause of invalid Brand')
    .delete(`/users/self/google/${results.google.createGoogleCredential}`)
    .addHeader('X-RECHAT-BRAND', invalidBrandId)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function getRemoteCalendars(cb) {
  return frisby.create('List Google Remote Calendars - initial')
    .get(`/users/google/${results.google.createGoogleCredential}/calendars`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

function configureCalendars(cb) {
  return frisby.create('Configure Google Calendars')
    .post(`/users/google/${results.google.createGoogleCredential}/conf`, {
      toSync: ['my_gmail@gmail.com']
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(204)
}

function getRemoteCalendarsAfterConfiguring(cb) {
  return frisby.create('List Google Remote Calendars')
    .get(`/users/google/${results.google.createGoogleCredential}/calendars`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

function reCconfigCaledars(cb) {
  return frisby.create('Reconfig Google Calendars')
    .post(`/users/google/${results.google.createGoogleCredential}/conf`, {
      toSync: ['en.usa#holiday@group.v.calendar.google.com'],
      toStopSync: ['my_gmail@gmail.com']
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(204)
}


module.exports = {
  requestGmailAccess,
  grantAccessWithMissedCode,
  grantAccessWithMissedState,
  grantAccessWithMissedScope,
  deleteAccountFailed,
  forceSyncFailed,
  createGoogleCredential,
  addGoogleSyncHistory,
  getGoogleProfile,
  getGoogleProfiles,
  forceSync,
  deleteAccount,
  deleteAccountFailedCauseOfInvalidBrand,
  getRemoteCalendars,
  configureCalendars,
  getRemoteCalendarsAfterConfiguring,
  reCconfigCaledars
}
