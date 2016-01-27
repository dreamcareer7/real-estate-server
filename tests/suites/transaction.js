var uuid                 = require('node-uuid');
var fs                   = require('fs');
var path                 = require('path');
var FormData             = require('form-data');
var config               = require('../../lib/config.js');
var transaction          = require('./data/transaction.js');
var transaction_response = require('./expected_objects/transaction.js');
var info_response        = require('./expected_objects/info.js');

registerSuite('contact', ['create']);

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
};

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
};

var attach = (cb) => {
  var form = new FormData();
  var logoPath = path.resolve(__dirname, './data/logo.png');
  var binaryData = [0xDE, 0xCA, 0xFB, 0xAD];

  form.append('buffer', new Buffer(binaryData), {
    contentType: 'application/octet-stream',
    filename: 'logo.png'
  });

  form.append('image', fs.createReadStream(logoPath), {
    knownLength: fs.statSync(logoPath).size
  });

  return frisby.create('attach file')
    .post('/transactions/' + results.transaction.create.data.id + '/attachments', form,
    {
      json: false,
      headers: {
        'authorization': 'Bearer ' + results.authorize.token.access_token,
        'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
        'content-length': form.getLengthSync()
      }
    })
    .after(cb)
    .expectStatus(200);
};

var getTransaction404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when getting a transaction')
    .get('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
};

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
};

var assign = (cb) => {
  return frisby.create('assign contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/roles', {
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
};

var assignWorked = (cb) => {
  return frisby.create('make sure assign worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        roles: [
          {
            contact: {
              id: results.contact.create.data[0].id
            }
          }
        ]
      }
    });
};

var assign400 = (cb) => {
  return frisby.create('expect 400 with empty model when assigning contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/roles')
    .after(cb)
    .expectStatus(400);
};

var assign404 = (cb) => {
  return frisby.create('expect 404 with invalid id when assigning contact to transaction')
    .post('/transactions/' + uuid.v1() + '/roles', {
      contacts: [results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(404);
};

var withdraw = (cb) => {
  return frisby.create('withdraw transaction')
    .delete('/transactions/' + results.transaction.create.data.id + '/roles/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(200);
};

var withdrawWorked = (cb) => {
  return frisby.create('make sure withdraw worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {roles: null}
    });
};

var withdraw404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when withdrawing')
    .delete('/transactions/' + uuid.v1() + '/roles/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(404);
};

var withdraw404_2 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when withdrawing')
    .delete('/transactions/' + results.transaction.create.data.id + '/roles/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
};

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
};

var patchTransactionWorked = (cb) => {
  return frisby.create('make sure patch transaction worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {transaction_type: 'Seller'}
    });
};

var patchTransaction404 = (cb) => {
  return frisby.create('expect 400 with empty model when patching a  transaction')
    .put('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
};

var remove = (cb) => {
  return frisby.create('remove a transaction')
    .delete('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(204);
};

var removeWorked = (cb) => {
  return frisby.create('make sure remove worked')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      data: {
        deleted_at: Number
      }
    });
};

var remove404 = (cb) => {
  return frisby.create('expect 404 with invalid id when removing a transaction')
    .delete('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
};

module.exports = {
  create,
  create400,
  attach,
  // getTransaction,
  // getTransaction404,
  // getUserTransaction,
  // assign,
  // assignWorked,
  // assign400,
  // assign404,
  // withdraw,
  // withdrawWorked,
  // withdraw404,
  // withdraw404_2,
  // patchTransaction,
  // patchTransactionWorked,
  // patchTransaction404,
  // remove,
  // removeWorked,
  // remove404
};
