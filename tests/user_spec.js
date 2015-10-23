var Tests  = require('./Tests.js');
var frisby = Tests.frisby;

var password = 'aaaaaa';
var user =  {first_name:'John', last_name: 'Doe', email:'emilsedgh@gmail.com', user_type:'Client', 'password':password,'grant_type':'password'}

var client = JSON.parse(JSON.stringify(user));
client.client_id = Tests.auth.client_id;
client.client_secret = Tests.auth.client_secret;

var address = {
  title:'title',
  subtitle:'subtitle',
  street_number:'#333',
  street_name:'phu street',
  city:'los majones',
  state:'texas',
  state_code:'TX',
  postal_code:'12345',
  neighborhood:'disastrous place',
  street_suffix: 'foobar',
  unit_number: '12D',
  country:'United States',
  country_code:'USA'
}

var createUser = (cb) => {
  return frisby.create('create user')
    .post('/users', client)
    .expectStatus(201)
    .afterJSON(function(json) {
      user.id = json.data.id;
      delete user.password;
      delete user.grant_type;
      delete user.client_id;
      delete user.client_secret;
      cb(null, json)
    });
}

var getUser = function(cb) {
  return frisby.create('get user')
  .get('/users/'+user.id)
  .expectJSON({
    code:'OK',
    data:user,
  })
  .expectStatus(200)
  .after(cb);
}

var updateUser = (cb) => {
  var updatedUser = JSON.parse(JSON.stringify(user));
  updatedUser.first_name = 'updated first name';
  updatedUser.password = password;

  return frisby.create('update user')
  .put('/users/'+user.id, updatedUser)
  .expectStatus(200)
  .after(cb);
}

var resetPassword = (cb) => {
  return frisby.create('initiate password reset')
  .post('/users/reset_password', {email:user.email})
  .expectStatus(200)
  .after(cb);
}

var deleteUser = (cb) => {
  return frisby.create('delete user')
  .delete('/users/'+user.id)
  .after(cb)
  .expectStatus(204);
}

var setAddress = (cb) => {
  return frisby.create('set address')
  .put('/users/'+user.id+'/address', address)
  .after(cb)
  .expectStatus(200);
}

var deleteAddress = (cb) => {
  return frisby.create('delete address')
  .delete('/users/'+user.id+'/address')
  .after(cb)
  .expectStatus(200);
}

var tasks = {
  createUser,
  getUser,
  updateUser,
  resetPassword,
  setAddress,
  deleteAddress
}

Tests.run(tasks);

module.exports = tasks;