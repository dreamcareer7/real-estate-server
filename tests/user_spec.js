var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

var user = {
  username:'phubar',
  firstname:'foo',
  lastname:'bar',
  email:'foo.bar@provider.tld',
  phonenumber:'989124834198',
};

var address = {
  title:'title',
  subtitle:'subtitle',
  streetnumber:'#333',
  streetname:'phu street',
  city:'los majones',
  state:'texas',
  statecode:'TX',
  postalcode:'12345',
  neighborhood:'disastrous place'
}

var getUser = frisby.create('get user')
  .get(URL+'/user/'+user.username)
  .expectJSON(user)
  .expectStatus(200);

var createUser = frisby.create('create user')
  .post(URL+'/user', user)
  .expectStatus(201);

var updatedUser = JSON.parse(JSON.stringify(user));
updatedUser.firstname = 'updated first name';
var updateUser = frisby.create('update user')
  .put(URL+'/user/'+user.username, updatedUser)
  .expectStatus(200);

var getUpdatedUser = frisby.create('get updated user')
  .get(URL+'/user/'+user.username)
  .expectJSON(updatedUser)
  .expectStatus(200);

var deleteUser = frisby.create('delete user')
  .delete(URL+'/user/'+user.username)
  .expectStatus(200);

var setAddress = frisby.create('set address')
  .put(URL+'/user/'+user.username+'/address', address)
  .expectStatus(200);

var deleteAddress = frisby.create('delete address')
  .delete(URL+'/user/'+user.username+'/address')
  .expectStatus(200);

var getAddress = frisby.create('get address')
  .get(URL+'/user/'+user.username+'/address')
  .expectJSON(address)
  .expectStatus(200);

describe("/user", function() {
  it("creates, gets and deletes a user", function() {
    createUser.after(function() {
      getUser.after(function() {
        updateUser.after(function() {
          getUpdatedUser.after(function() {
            setAddress.after(function() {
              getAddress.after(function() {
                deleteAddress.after(function() {
                  deleteUser.toss();
                }).toss();
              }).toss();
            }).toss();
          }).toss();
        }).toss();
      }).toss();
    }).toss();
  });
});