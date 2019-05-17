const showings_credential = require('./expected_objects/showings_credential.js')


registerSuite('agent', ['add'])
registerSuite('brand', ['createParent', 'create'])
registerSuite('contact', ['brandCreateParent', 'brandCreate'])



function createCredential(cb) {
  const body = {
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

function createDuplicateCredential(cb) {
  const body = {
    username: 'username',
    password: 'password'
  }

  return frisby.create('create a duplicate showings credential')
    .post('/showings/credentials', body)
    .after(cb)
    .expectStatus(409)
}

function getCredential(cb) {
  return frisby.create('get a showings credential by user and brand')
    .get('/showings/credentials')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function updateCredential(cb) {
  const body = {
    username: 'new_username',
    password: 'new_password'
  }

  return frisby.create('update a showings credential')
    .put('/showings/credentials/', body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function deleteCredential(cb) {
  return frisby.create('update a showings credential')
    .delete('/showings/credentials/')
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createCredential,
  createDuplicateCredential,
  getCredential,
  updateCredential,
  deleteCredential
}