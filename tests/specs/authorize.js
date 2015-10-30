var config = require('../../lib/config.js');

var auth_params = {
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
  username: config.tests.username,
  password: config.tests.password,
  grant_type: 'password'
};

var token = (cb) => {
  return frisby.create('get token')
    .post('/oauth2/token', auth_params)
    .expectStatus(200)
    .after( (err, res, json) => {
      var setup = frisby.globalSetup();

      setup.request.headers['Authorization'] = 'Bearer ' + json.access_token;

      frisby.globalSetup(setup);
      cb(err, res);
  });
}

module.exports = {token};
