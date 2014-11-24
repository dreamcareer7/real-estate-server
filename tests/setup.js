var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

frisby.globalSetup({
  request: {
    json:true
  }
});

var auth_params = {
  client_id:'bf0da47e-7226-11e4-905b-0024d71b10fc',
  client_secret:'secret',
  username:'test',
  password:'password',
  grant_type:'password',
}

module.exports = function(cb) {
  var auth = frisby.create('authenticate')
  .post(URL+'/oauth2/token', auth_params)
  .expectStatus(200)
  .afterJSON(function(json) {
    frisby.globalSetup({
      request: {
        json:true,
        headers: {
          Authorization: 'Bearer '+json.access_token
        }
      }
    });

    cb(null, frisby, URL);
  });

  describe('/oauth2', function() {
    auth.toss();
  });
};