const google_auth_link_json  = require('./expected_objects/google/auth_link.js')
const google_credential_json = require('./expected_objects/google/credential.js')
const google_profile_json    = require('./expected_objects/google/profile.js')

registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('contact', ['brandCreateParent', 'brandCreate'])


async function createMockRecords() {

}


function requestGmailAccess(cb) {
  return frisby.create('Request Google auhoriziation link')
    .post('/users/self/google', { redirect: 'http://localhost:3078/dashboard/contacts/' })
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

const CreateGoogleCredential = (cb) => {
  const scope = ['contacts.readonly']

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
    scope: scope
  }

  return frisby.create('CreateGoogleCredential')
    .post('/jobs', {
      name: 'GoogleCredential.create',
      data: body
    })
    .after(function(err, res, credentialId) {
      cb(err, res, credentialId)
    })
    .expectStatus(200)
}

function getGoogleProfile(cb) {
  return frisby.create('Get Google profiles')
    .get(`/users/self/google/${results.google.CreateGoogleCredential}`)
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
    .get('/users/self/google')
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

/*
function getGoogpleProfile(cb) {
  return frisby.create('Get Google profile')
    .get('/users/self/google/:id')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      // data: google_profile_json
    })
}

function revokeAccess(cb) {
  return frisby.create('Get Google profile')
    .delete('/users/self/google/:id')
    .after(cb)
    .expectStatus(204)
}
*/

module.exports = {
  requestGmailAccess,
  grantAccessWithMissedCode,
  grantAccessWithMissedState,
  grantAccessWithMissedScope,
  CreateGoogleCredential,
  getGoogleProfile,
  getGoogleProfiles,
  // getGoogpleProfile,
  // revokeAccess
}