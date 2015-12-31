var config = require('../../lib/config.js');

var session = require('./data/session.js');
var client = JSON.parse(JSON.stringify(session));
var session_response = require('./expected_objects/session.js');

client.client_id = config.tests.client_id;
client.client_secret = config.tests.client_secret;


var create = (cb) => {
  return frisby.create('create new session')
    .post('/sessions', client)
    .after(cb)
    .expectStatus(201)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'session'
      }
    })
    .expectJSONTypes({
      code: String,
      data: session_response
    });
}

var create401 = (cb) => {
  return frisby.create('expect 401 with empty model when creating new session')
    .post('/sessions')
    .after(cb)
    .expectStatus(401);
}

var goat = (cb) => {
  return frisby.create('present goat')
    .get('/sessions')
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  create,
  create401,
  goat
}
