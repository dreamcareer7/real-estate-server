const uuid = require('uuid')

const microsoft_auth_link_json   = require('./expected_objects/microsoft/auth_link.js')
const microsoft_credential_json  = require('./expected_objects/microsoft/credential.js')
const microsoft_syncHistory_json = require('./expected_objects/microsoft/sync_history.js')
// const microsoft_profile_json  = require('./expected_objects/microsoft/profile.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('contact', ['brandCreateParent', 'brandCreate'])



function requestOutlookAccess(cb) {
  return frisby.create('Request Microsoft auhoriziation link')
    .post('/users/self/microsoft', {
      redirect: 'http://localhost:3078/dashboard/contacts/',
      body: ['Contacts.Read', 'Mail.Read', 'Mail.Send']
    })
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
    .delete(`/users/self/microsoft/${results.user.create.data.id}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function disableSyncFailed(cb) {
  return frisby.create('disableSync Failed')
    .delete(`/users/self/microsoft/${results.user.create.data.id}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function enableSyncFailed(cb) {
  return frisby.create('enableSync Failed')
    .put(`/users/self/microsoft/${results.user.create.data.id}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function forceSyncFailed(cb) {
  return frisby.create('forceSync Failed')
    .post(`/users/self/microsoft/${results.user.create.data.id}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}


const CreateMicrosoftCredential = (cb) => {
  const scope = 'Contacts.Read Mail.Read Mail.Send'

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
      scope: scope
    }
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

function getMicrosoftProfile(cb) {
  return frisby.create('Get Microsoft profiles')
    .get(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}`)
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
    .get('/users/self/microsoft')
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

function deleteAccount(cb) {
  return frisby.create('Delete Microsoft account')
    .delete(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}`)
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
    .delete(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}`)
    .addHeader('X-RECHAT-BRAND', invalidBrandId)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(404)
}

function disableSync(cb) {
  return frisby.create('disable sync')
    .delete(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectJSON({
      code: 'OK',
      data: microsoft_credential_json
    })
}

function enableSync(cb) {
  return frisby.create('enable dync')
    .put(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectJSON({
      code: 'OK',
      data: microsoft_credential_json
    })
}

function forceSync(cb) {
  return frisby.create('force sync')
    .post(`/users/self/microsoft/${results.microsoft.CreateMicrosoftCredential}/sync`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectJSON({
      code: 'OK',
      data: microsoft_credential_json
    })
}


const addMicrosoftSyncHistory = (cb) => {
  const body  = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,
    microsoft_credential: results.microsoft.CreateMicrosoftCredential,
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

function getMCredentialLastSyncHistory(cb) {
  return frisby.create('get microsoft credential LastSyncHistory')
    .get(`/users/self/microsoft/sync_history/${results.microsoft.CreateMicrosoftCredential}`)
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .after(function(err, res, json) {
      cb(err, res, json)
    })
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: microsoft_syncHistory_json
    })
}


module.exports = {
  requestOutlookAccess,
  grantAccessWithMissedCode,
  grantAccessWithMissedState,
  deleteAccountFailed,
  disableSyncFailed,
  enableSyncFailed,
  forceSyncFailed,
  CreateMicrosoftCredential,
  getMicrosoftProfile,
  getMicrosoftProfiles,
  deleteAccount,
  deleteAccountFailedCauseOfInvalidBrand,
  disableSync,
  enableSync,
  forceSync,
  addMicrosoftSyncHistory,
  getMCredentialLastSyncHistory
}