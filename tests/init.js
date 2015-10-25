var config = require('../lib/config.js');
var URL = 'http://localhost:' + config.tests.port;

frisby.globalSetup({
  request: {
    json: true
  }
});

var auth_params = {
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
  username: config.tests.username,
  password: config.tests.password,
  grant_type: 'password'
};

var authorize = (cb) => {
  return frisby.create('get token')
    .post(URL + '/oauth2/token', auth_params)
    .expectStatus(200)
    .afterJSON( (json) => {
      frisby.globalSetup({
        timeout: 10000,
        request: {
          json: true,
          baseUri: URL,
          headers: {
            Authorization: 'Bearer ' + json.access_token
          }
        }
      });
      cb();
  });
};

module.exports = authorize;
