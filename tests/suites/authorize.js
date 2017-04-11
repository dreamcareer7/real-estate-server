const config = require('../../lib/config.js')

const responses = require('./expected_objects/authorize.js')

const auth_params = {
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
  username: config.tests.username,
  password: config.tests.password,
  grant_type: 'password'
}

const token = (cb) => {
  return frisby.create('get token')
    .post('/oauth2/token', auth_params)
    .expectStatus(200)
    .after((err, res, json) => {
      const setup = frisby.globalSetup()

      setup.request.headers['Authorization'] = 'Bearer ' + json.access_token

      frisby.globalSetup(setup)
      cb(err, res)
    })
    .expectJSONTypes(responses.access)
}

const refresh = (cb) => {
  const params = {
    refresh_token: results.authorize.token.refresh_token,
    grant_type: 'refresh_token',
    client_id: config.tests.client_id,
    client_secret: config.tests.client_secret
  }

  return frisby.create('refresh token')
    .post('/oauth2/token', params)
    .expectStatus(200)
    .expectJSONTypes(responses.refresh)
}


module.exports = {
  token,
  refresh
}
