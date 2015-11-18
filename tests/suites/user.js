var config   = require('../../lib/config.js');

var user     = require('./data/user.js');
var address  = require('./data/address.js');

var password = config.tests.password;

var client = JSON.parse(JSON.stringify(user));

client.client_id = config.tests.client_id;
client.client_secret = config.tests.client_secret;


var create = (cb) => {
  return frisby.create('create user')
    .post('/users', client)
    .after(cb)
    .expectStatus(201);
};

var get = (cb) => {
  return frisby.create('get user')
    .get('/users/'+ results.user.create.data.id)
    .expectJSON({
      code: 'OK',
      data: results.user.create.data
    })
    .after(cb)
    .expectStatus(200);
};

var update = (cb) => {
  var updatedUser = JSON.parse(JSON.stringify(results.authorize.token.data));
  updatedUser.first_name = 'updated first name';
  updatedUser.password = password;

  return frisby.create('update user')
    .put('/users/self', updatedUser)
    .after(cb)
    .expectStatus(200);
};

var resetPassword = (cb) => {
  return frisby.create('initiate password reset')
    .post('/users/reset_password', {email: user.email})
    .after(cb)
    .expectStatus(204);
};

var del = (cb) => {
  return frisby.create('delete user')
    .delete('/users/self')
    .after(cb)
    .expectStatus(204);
};

var setAddress = (cb) => {
  return frisby.create('set address')
    .put('/users/self/address', address)
    .after(cb)
    .expectStatus(200);
};

var deleteAddress = (cb) => {
  return frisby.create('delete address')
    .delete('/users/self/address')
    .after(cb)
    .expectStatus(200);
};

module.exports = {
  create,
  get: get,
  update,
  resetPassword,
  setAddress,
  deleteAddress,
  delete: del
};
