var config = require('../../lib/config.js');

var user = require('./data/user.js');
var address = require('./data/address.js');

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
    .get('/users/' + results.user.create.data.id)
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

var changePassword = (cb) => {
  return frisby.create('change password of a user')
    .patch('/users/self/password', {
      old_password: password,
      new_password: 'aaaaaa'
    })
    .after(cb)
    .expectStatus(200);
};

var resetPassword = (cb) => {
  return frisby.create('initiate password reset')
    .post('/users/reset_password', {email: user.email})
    .after(cb)
    .expectStatus(204);
};

var setAddress = (cb) => {
  return frisby.create('set address')
    .put('/users/self/address', address)
    .after(cb)
    .expectStatus(200);
};

var patchUserTimeZone = (cb) => {
  return frisby.create('change timezone setting for a user')
    .patch('/users/self/timezone', {time_zone: results.user.create.data.timezone})
    .after(cb)
    .expectStatus(204);
};

var searchRelatedUser = (cb) => {
  return frisby.create('find related user')
    .get('/users/related/search?q=' + results.user.create.data.first_name)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    });
}

var searchByEmail = (cb) => {
  return frisby.create('search users by email')
    .get('/users/search?email=' + results.user.create.data.email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'compact_user'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByCode = (cb) => {
  return frisby.create('search users by code')
    .get('/users/search?code=' + results.user.create.data.user_code)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user'
      }
    })
}

var searchByPhone = (cb) => {
  return frisby.create('search users by phone')
    .get('/users/search?phone=' + results.user.create.data.phone_number)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'compact_user'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var deleteAddress = (cb) => {
  return frisby.create('delete address')
    .delete('/users/self/address')
    .after(cb)
    .expectStatus(200);
};

var del = (cb) => {
  return frisby.create('delete user')
    .delete('/users/self')
    .after(cb)
    .expectStatus(204);
};

module.exports = {
  create,
  get: get,
  update,
  changePassword,
  resetPassword,
  setAddress,
  patchUserTimeZone,
  searchRelatedUser,
  searchByEmail,
  searchByCode,
  searchByPhone,
  deleteAddress,
  delete: del
};
