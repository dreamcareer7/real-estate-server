const config = require('../../lib/config.js')

const authorize_reponse = require('./expected_objects/authorize.js')

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
    .expectJSONTypes(authorize_reponse)
}

module.exports = {
  token
}
