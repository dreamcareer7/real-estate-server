var config = require('../../lib/config.js');

var authorize_reponse = require('./expected_objects/authorize.js');

var auth_params = {
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
  username: config.tests.username,
  password: config.tests.password,
  grant_type: 'password'
};

var token = (cb, auth) => {
  if (auth === undefined) //You can optionally give it an auth object. Or it will have a default.
    auth = auth_params;
  return frisby.create('get token')
    .post('/oauth2/token', auth_params)
    .expectStatus(200)
    .after((err, res, json) => {
      var setup = frisby.globalSetup();

      setup.request.headers['Authorization'] = 'Bearer ' + json.access_token;

      frisby.globalSetup(setup);
      cb(err, res);
    })
    .expectJSONTypes(authorize_reponse);
}

var token401 = (cb, auth) => {
  if (auth === undefined)
    auth = auth_params;
  return frisby.create('get token')
    .post('/oauth2/token')
    .expectStatus(401);
}

var token403 = (cb, auth) => {
  if (auth === undefined)
    auth = auth_params;
  return frisby.create('get token')
    .post('/oauth2/token', auth_params)
    .expectStatus(403);
}

module.exports = {
  token,
  //token401,
  //token403
};
