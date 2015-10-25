var config   = require('../../lib/config.js');

var user     = require('./data/user.js');
var address  = require('./data/address.js')

var password = config.tests.password;

var client = JSON.parse(JSON.stringify(user));

client.client_id = config.tests.client_id;
client.client_secret = config.tests.client_secret;


var createUser = (cb) => {
  return frisby.create('create user')
         .post('/users', client)
         .expectStatus(201)
         .afterJSON( (json) => {
           user.id = json.data.id;
           delete user.password;
           delete user.grant_type;
           delete user.client_id;
           delete user.client_secret;
           cb(null, json)
         });
}

var getUser = (cb) => {
  return frisby.create('get user')
         .get('/users/'+ user.id)
         .expectJSON({
           code: 'OK',
           data: user,
         })
         .expectStatus(200)
         .after(cb);
}

var updateUser = (cb) => {
  var updatedUser = JSON.parse(JSON.stringify(user));
  updatedUser.first_name = 'updated first name';
  updatedUser.password = password;

  return frisby.create('update user')
         .put('/users/' + user.id, updatedUser)
         .expectStatus(200)
         .after(cb);
}

var resetPassword = (cb) => {
  return frisby.create('initiate password reset')
         .post('/users/reset_password', {email: user.email})
         .expectStatus(200)
         .after(cb);
}

var deleteUser = (cb) => {
  return frisby.create('delete user')
         .delete('/users/' + user.id)
         .after(cb)
         .expectStatus(204);
}

var setAddress = (cb) => {
  return frisby.create('set address')
         .put('/users/' + user.id + '/address', address)
         .after(cb)
         .expectStatus(200);
}

var deleteAddress = (cb) => {
  return frisby.create('delete address')
         .delete('/users/' + user.id + '/address')
         .after(cb)
         .expectStatus(200);
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  resetPassword,
  setAddress,
  deleteAddress
}