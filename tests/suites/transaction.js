var config = require('../../lib/config.js');
var transaction = require('./data/transaction.js')
var uuid = require('node-uuid');
//registerSuite('recommendation', ['feed']);
registerSuite('contact', ['create']);

var transaction_response = require('./expected_objects/transaction.js');
var info_response = require('./expected_objects/info.js');
var transaction_response = require('./expected_objects/transaction.js');


var create = (cb) => {
  return frisby.create('create new transaction')
    .post('/transactions', transaction)
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

var create400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/transactions')
    .after(cb)
    .expectStatus(400);
};

var getTransaction = (cb) => {
  return frisby.create('get transaction')
    .get('/transactions/' + results.transaction.create.data.id)
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

var getTransaction404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when getting a transaction')
    .get('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var getUserTransaction = (cb) => {
  return frisby.create('create a transaction by user id')
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

var assign = (cb) => {
  return frisby.create('assign contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts', {
      contacts: [results.contact.create.data[0].id]
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

var assignWorked = (cb) => {
  return frisby.create('make sure assign worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {contacts:[
        {
          id: results.contact.create.data[0].id
        }
      ]}
    });
}

var assign400 = (cb) => {
  return frisby.create('expect 400 with empty model when assigning contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts')
    .after(cb)
    .expectStatus(400);
}

var assign404 = (cb) => {
  return frisby.create('expect 404 with invalid id when assigning contact to transaction')
    .post('/transactions/' + uuid.v1() + '/contacts', {
      contacts: [results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(404);
}

var addRole = (cb) => {
  return frisby.create('add role to a transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts/' + results.contact.create.data[0].id + '/roles',
    {
      roles: ['foo']
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

var addRoleWorked = (cb) => {
  return frisby.create('make sure add role worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {contacts:[
        {
          roles:['foo']
        }
      ]}
    });
}

var addRole404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when adding a role')
    .post('/transactions/' + uuid.v1() + '/contacts/' + results.contact.create.data[0].id + '/roles',
    {
      roles: ['foo']
    })
    .after(cb)
    .expectStatus(404)
}

var addRole404_2 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when adding a role')
    .post('/transactions/' + results.transaction.create.data.id + '/contacts/' + uuid.v1() + '/roles',
    {
      roles: ['foo']
    })
    .after(cb)
    .expectStatus(404)
}

var removeRole404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when removing a role')
    .delete('/transactions/' + uuid.v1() + '/contacts/' + results.contact.create.data[0].id + '/roles/foo')
    .after(cb)
    .expectStatus(404);
}

var removeRole404_2 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when removing a role')
    .delete('/transactions/' + results.transaction.create.data.id + '/contacts/' + uuid.v1() + '/roles/foo')
    .after(cb)
    .expectStatus(404);
}

var removeRole = (cb) => {
  return frisby.create('remove role from a transaction')
    .delete('/transactions/' + results.transaction.create.data.id + '/contacts/' + results.contact.create.data[0].id + '/roles/foo')
    .after(cb)
    .expectStatus(204);
}

var removeRoleWorked = (cb) => {
  return frisby.create('make sure remove role worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {contacts:[
        {
          roles:[]
        }
      ]}
    });
}

var withdraw = (cb) => {
  return frisby.create('withdraw transaction')
    .delete('/transactions/' + results.transaction.create.data.id + '/contacts/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(200);
}

var withdrawWorked = (cb) => {
  return frisby.create('make sure withdraw worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {contacts:null}
    });
}

var withdraw404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when withdrawing')
    .delete('/transactions/' + uuid.v1() + '/contacts/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(404);
}

var withdraw404_2 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when withdrawing')
    .delete('/transactions/' + results.transaction.create.data.id + '/contacts/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var patchTransaction = (cb) => {
  return frisby.create('patch transaction')
    .put('/transactions/' + results.transaction.create.data.id, {
      user: results.contact.create.data[0].contact_user.id,
      transaction_type: 'Seller'
    })
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: transaction_response
    });
}

var patchTransactionWorked = (cb) => {
  return frisby.create('make sure patch transaction worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {transaction_type: 'Seller'}
    });
}

var patchTransaction404 = (cb) => {
  return frisby.create('expect 400 with empty model when patching a  transaction')
    .put('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var remove = (cb) => {
  return frisby.create('remove a transaction')
    .delete('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(204);
}

var removeWorked = (cb) => {
  return frisby.create('make sure remove worked')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      data:{
        deleted_at: Number
      }
    });
}

var remove404 = (cb) => {
  return frisby.create('expect 404 with invalid id when removing a transaction')
    .delete('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

module.exports = {
  create,
  create400,
  getTransaction,
  getTransaction404,
  getUserTransaction,
  assign,
  assignWorked,
  assign400,
  assign404,
  addRole,
  addRoleWorked,
  addRole404,
  addRole404_2,
  removeRole404,
  removeRole404_2,
  removeRole,
  removeRoleWorked,
  withdraw,
  withdrawWorked,
  withdraw404,
  withdraw404_2,
  patchTransaction,
  patchTransactionWorked,
  patchTransaction404,
  remove,
  removeWorked,
  remove404
}
