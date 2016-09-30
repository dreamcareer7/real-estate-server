const uuid = require('node-uuid')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const transaction = require('./data/transaction.js')
const transaction_response = require('./expected_objects/transaction.js')

registerSuite('contact', ['create'])

const create = (cb) => {
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
    })
}

const create400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/transactions')
    .after(cb)
    .expectStatus(400)
}

const getTransaction = (cb) => {
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
    })
}

const addNote = (cb) => {
  return frisby.create('add note to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/notes', {note: 'foo'})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: transaction_response
    })
}

const getNotes = (cb) => {
  return frisby.create('get transaction notes')
    .get('/transactions/' + results.transaction.create.data.id + '/notes')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONLength('data', 1)
    .expectJSONTypes({
      code: String,
      data: [{note: 'foo'}]
    })
}

const removeNote = (cb) => {
  return frisby.create('remove transaction notes')
    .delete('/transactions/' + results.transaction.create.data.id + '/notes/' + results.transaction.getNotes.data[0].id)
    .after(cb)
    .expectStatus(204)
}

const attach = (cb) => {
  const form = new FormData()
  const logoPath = path.resolve(__dirname, './data/logo.png')
  const binaryData = [0xDE, 0xCA, 0xFB, 0xAD]

  form.append('buffer', new Buffer(binaryData), {
    contentType: 'application/octet-stream',
    filename: 'logo.png'
  })

  form.append('image', fs.createReadStream(logoPath), {
    knownLength: fs.statSync(logoPath).size
  })

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
    .expectStatus(200)
}

const getTransaction404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when getting a transaction')
    .get('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const getUserTransaction = (cb) => {
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
    })
}

const assign = (cb) => {
  return frisby.create('assign contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/roles', {
      roles: [
        {
          contact: results.contact.create.data[0].id,
          role_types: ['foo']
        }
      ]
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: transaction_response
    })
}

const assignWorked = (cb) => {
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
    })
}

const assign400 = (cb) => {
  return frisby.create('expect 400 with empty model when assigning contact to transaction')
    .post('/transactions/' + results.transaction.create.data.id + '/roles')
    .after(cb)
    .expectStatus(400)
}

const assign404 = (cb) => {
  return frisby.create('expect 404 with invalid id when assigning contact to transaction')
    .post('/transactions/' + uuid.v1() + '/roles', {
      roles: [results.contact.create.data[0].id]
    })
    .after(cb)
    .expectStatus(404)
}

const withdraw = (cb) => {
  return frisby.create('withdraw transaction')
    .delete('/transactions/' + results.transaction.create.data.id + '/roles/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(200)
}

const withdrawWorked = (cb) => {
  return frisby.create('make sure withdraw worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        roles: null
      }
    })
}

const withdraw404 = (cb) => {
  return frisby.create('expect 404 with invalid transaction id when withdrawing')
    .delete('/transactions/' + uuid.v1() + '/roles/' + results.contact.create.data[0].id)
    .after(cb)
    .expectStatus(404)
}

const withdraw404_2 = (cb) => {
  return frisby.create('expect 404 with invalid contact id when withdrawing')
    .delete('/transactions/' + results.transaction.create.data.id + '/roles/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const patchTransaction = (cb) => {
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
    })
}

const patchTransactionWorked = (cb) => {
  return frisby.create('make sure patch transaction worked correctly')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {transaction_type: 'Seller'}
    })
}

const patchTransaction404 = (cb) => {
  return frisby.create('expect 400 with empty model when patching a  transaction')
    .put('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const remove = (cb) => {
  return frisby.create('remove a transaction')
    .delete('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(204)
}

const removeWorked = (cb) => {
  return frisby.create('make sure remove worked')
    .get('/transactions/' + results.transaction.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      data: {
        deleted_at: Number
      }
    })
}

const remove404 = (cb) => {
  return frisby.create('expect 404 with invalid id when removing a transaction')
    .delete('/transactions/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

module.exports = {
  create,
  create400,
  addNote,
  getNotes,
  removeNote,
  attach,
  getTransaction,
  getTransaction404,
  getUserTransaction,
  assign,
  assignWorked,
  assign400,
  assign404,
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
