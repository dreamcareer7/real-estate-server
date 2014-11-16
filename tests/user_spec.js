var frisby = require('frisby');
var config = require('../lib/config.js');

var URL = 'http://localhost:'+config.http.port;

var user = {
  username:'phubar',
  firstname:'foo',
  lastname:'bar',
  email:'foo.bar@provider.tld',
  phonenumber:'989124834198',
  address:'foo bar phooo phoo phoo'
};

var getUser = frisby.create('get user')
  .get(URL+'/user/'+user.username)
  .expectJSON(user)
  .expectStatus(200);

var createUser = frisby.create('create user')
  .post(URL+'/user', user)
  .expectStatus(201);

var deleteUser = frisby.create('delete user')
  .delete(URL+'/user/'+user.username)
  .expectStatus(200);

describe("/user", function() {
  it("create, get and delete the user", function() {
    createUser.after(function() {
      getUser.after(function() {
        deleteUser.toss();
      }).toss();
    }).toss();
  });
});