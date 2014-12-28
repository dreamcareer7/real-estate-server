var session = {
  device_name:'iPhone Emulator',
  device_uuid:'AC285B9D-6C5A-48F7-A704-7D6F12D70BFE',
  client_version:'0.1'
};

var setup = require('./setup.js');

var req = JSON.parse(JSON.stringify(session));
req.client_id = setup.auth.client_id;
req.client_secret = setup.auth.client_secret;

setup(function(err, frisby, URL) {

  var createSession = frisby.create('create session')
    .post(URL+'/sessions', req)
    .expectStatus(201)
    .expectJSON({
      code:'OK',
      data:{
        type: "session",
        api_base_url: "https://api.shortlisted.com:443",
        client_version_status: "UpgradeAvailable",
      }
    });


  describe("/session", function() {
    it("creates a session", function() {
      createSession.toss();
    });
  });

});