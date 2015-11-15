var config = require('../../lib/config.js');

var session = require('./data/session.js');
var client = JSON.parse(JSON.stringify(session));

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

    });
}


var goat = (cb) => {
  return frisby.create('present goat')
    .get('/sessions')
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  create,
  goat
}
