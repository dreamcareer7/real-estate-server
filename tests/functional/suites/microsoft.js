const uuid = require('uuid')

const microsoft_auth_link_json   = require('./expected_objects/microsoft/auth_link.js')
const microsoft_credential_json  = require('./expected_objects/microsoft/credential.js')
// const microsoft_profile_json  = require('./expected_objects/microsoft/profile.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])



function requestOutlookAccess(cb) {
  return frisby.create('Request Microsoft auhoriziation link')
    .post('/users/self/microsoft', {
      redirect: 'http://localhost:3078/dashboard/contacts/',
      body: ['Contacts.Read', 'Mail.Read', 'Mail.Send']
    })
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: microsoft_auth_link_json
    })
}

function grantAccessWithMissedCode(cb) {
  const code  = ''
  const state = 'user::brand::redirect'
  const query = `?code=${code}&state=${state}`

  return frisby.create('Failed grant-access cause of missed code')
    .get(`/webhook/microsoft/grant${query}`)
    .after(cb)
    .expectStatus(400)
}

function grantAccessWithMissedState(cb) {
  const code  = 'xxx'
  const state = ''
  const query = `?code=${code}&state=${state}`

  return frisby.create('Failed grant-access cause of missed state')
    .get(`/webhook/microsoft/grant${query}`)
    .after(cb)
    .expectStatus(400)
}

function deleteAccountFailed(cb) {
  return frisby.create('deleteAccount Failed')
    .delete(`/users/self/microsoft/${results.authorize.token.data.id}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function forceSyncFailed(cb) {
  return frisby.create('forceSync Failed')
    .post(`/users/self/microsoft/${results.authorize.token.data.id}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function createMicrosoftCredential(cb) {
  const scope = 'Contacts.Read Mail.Read Mail.Send Mail.ReadWrite Calendar'.split(' ')

  const scopeSummary = ['profile']

  if ( scope.includes('Contacts.Read') )
    scopeSummary.push('contacts.read')

  if ( scope.includes('Mail.Read') )
    scopeSummary.push('mail.read')

  // Right now we need both of Mail.send and Mail.ReadWrite to handle send-email API
  if ( scope.includes('Mail.Send') && scope.includes('Mail.ReadWrite') ) {
    scopeSummary.push('mail.send')
    scopeSummary.push('mail.modify')
  }

  if ( scope.includes('Calendar') )
    scopeSummary.push('calendar')

  const body  = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,

    profile: {
      email: 'email',
      remote_id: 'remote_id',
      displayName: 'displayName',
      firstName: 'firstName',
      lastName: 'lastName',
      photo: 'photo'
    },

    tokens: {
      access_token: 'access_token',
      refresh_token: 'refresh_token',
      id_token: 'id_token',
      expires_in: 3600,
      ext_expires_in: 3600,
      scope: scope.join(' ')
    },

    scope: scope,
    scopeSummary: scopeSummary
  }

  return frisby.create('Create Microsoft Credential')
    .post('/jobs', {
      name: 'MicrosoftCredential.create',
      data: body
    })
    .after(function(err, res, credentialId) {
      cb(err, res, credentialId)
    })
    .expectStatus(200)
}

function addMicrosoftSyncHistory(cb) {
  const body  = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,
    microsoft_credential: results.microsoft.createMicrosoftCredential,
    extract_contacts_error: 'extract_contacts_error',
    synced_contacts_num: 5,
    contacts_total: 6,
    sync_messages_error: 'sync_messages_error',
    synced_messages_num: 1,
    messages_total: 2,
    sync_duration: 7,
    status: true
  }

  return frisby.create('add microsoft SyncHistory')
    .post('/jobs', {
      name: 'MicrosoftSyncHistory.addSyncHistory',
      data: body
    })
    .after(function(err, res, syncHistory) {
      cb(err, res, syncHistory)
    })
    .expectStatus(200)
}

function getMicrosoftProfile(cb) {
  return frisby.create('Get Microsoft profiles')
    .get(`/users/self/microsoft/${results.microsoft.createMicrosoftCredential}?associations=google_credential.histories`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: microsoft_credential_json
    })
}

function getMicrosoftProfiles(cb) {
  return frisby.create('Get Microsoft profiles')
    .get('/users/self/microsoft?associations=google_credential.histories')
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [microsoft_credential_json]
    })
}

function forceSync(cb) {
  return frisby.create('force sync')
    .post(`/users/self/microsoft/${results.microsoft.createMicrosoftCredential}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
}

function deleteAccount(cb) {
  return frisby.create('Delete Microsoft account')
    .delete(`/users/self/microsoft/${results.microsoft.createMicrosoftCredential}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: microsoft_credential_json
    })
}

function deleteAccountFailedCauseOfInvalidBrand(cb) {
  const invalidBrandId = uuid.v4()

  return frisby.create('delete account failed Cause of invalid Brand')
    .delete(`/users/self/microsoft/${results.microsoft.createMicrosoftCredential}`)
    .addHeader('X-RECHAT-BRAND', invalidBrandId)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function getRemoteCalendars(cb) {
  return frisby.create('List Microsoft Remote Calendars - initial')
    .get(`/users/microsoft/${results.microsoft.createMicrosoftCredential}/calendars`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
}

/*
function configureCalendars(cb) {
}

function getRemoteCalendarsAfterConfiguring(cb) {
}

function reCconfigCaledars(cb) {
}
*/

module.exports = {
  requestOutlookAccess,
  grantAccessWithMissedCode,
  grantAccessWithMissedState,
  deleteAccountFailed,
  forceSyncFailed,
  createMicrosoftCredential,
  addMicrosoftSyncHistory,
  getMicrosoftProfile,
  getMicrosoftProfiles,
  forceSync,
  deleteAccount,
  deleteAccountFailedCauseOfInvalidBrand,
  getRemoteCalendars
  // configureCalendars,
  // getRemoteCalendarsAfterConfiguring,
  // reCconfigCaledars
}
