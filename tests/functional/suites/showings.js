const showings_credential = require('./expected_objects/showings_credential.js')


registerSuite('agent', ['add'])
registerSuite('brand', [ 'createParent', 'create' ])



function createCredential(cb) {
  const body = {
    user: results.authorize.token.data.id,
    brand: results.brand.create.data.id,
    username: 'username',
    password: 'password'
  }

  return frisby.create('create a showings credential')
    .post('/showings/credentials', body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function getCredential(cb) {
  return frisby.create('get a showings credential by user id')
    .get('/showings/credentials')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function getCredentialById(cb) {
  const credentialId = results.showings.createCredential.data.id

  return frisby.create('get a showings credential')
    .get(`/showings/credentials/${credentialId}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function updateCredential(cb) {
  const credentialId = results.showings.createCredential.data.id

  const body = {
    username: 'new_username',
    password: 'new_password'
  }

  return frisby.create('update a showings credential')
    .put(`/showings/credentials/${credentialId}`, body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function deleteCredential(cb) {
  const credentialId = results.showings.createCredential.data.id

  return frisby.create('update a showings credential')
    .delete(`/showings/credentials/${credentialId}`)
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createCredential,
  getCredential,
  getCredentialById,
  updateCredential,
  deleteCredential
}