var config = require('../../lib/config.js');
registerSuite('contact', ['create']);

var transaction_response = require('./expected_objects/transaction.js');
var info_response = require('./expected_objects/info.js');
var transaction_response = require('./expected_objects/transaction.js');


var create = (cb) => {
  return frisby.create('create new transaction')
    .post('/transactions', {
      user: results.contact.create.data[0].contact_user.id,
      transaction_type: 'Buyer'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: transaction_response
    });
}

var assign = (cb) => {
  return frisby.create('')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts', {
      contacts:[results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: transaction_response
    });
}

var getTransaction = (cb) => {
  return frisby.create('create new session')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200);
}

var getUserTransaction = (cb) => {
  return frisby.create('create new session')
    .get('/transactions/')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: [transaction_response]
    });
}

var addRole = (cb) => {
  return frisby.create('create new session')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts/' + results.contact.create.data[0].id,
    {
      roles: ['foo']
    })
    .after(cb)
    .expectStatus(200);
}

var removeRole = (cb) => {
  return frisby.create('create new session')
    .delete('/transactions/' + results.transaction.create.data.id + '/contacts/' + results.contact.create.data[0].id + '/roles/foo')
    .after(cb)
    .expectStatus(204);
}

var remove = (cb) => {
  return frisby.create('create new session')
    .delete('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(204);
}

module.exports = {
  create,
  assign,
  getTransaction,
  getUserTransaction,
  //addRole,
  //removeRole
  remove
}
