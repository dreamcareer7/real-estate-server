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
    .post('/users/self/showings/credentials', body)
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
    .post('/users/self/showings/credentials', body)
    .after(cb)
    .expectStatus(409)
}

function createBadCredential(cb) {
  const body = {
    username: 'bad-username',
    password: 'password'
  }

  return frisby.create('create a showings credential with invalid username/password')
    .post('/users/self/showings/credentials', body)
    .after(cb)
    .expectStatus(403)
}

function getCredential(cb) {
  return frisby.create('get a showings credential by user and brand')
    .get('/users/self/showings/credentials')
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
    .put('/users/self/showings/credentials/', body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function deleteCredential(cb) {
  return frisby.create('update a showings credential')
    .delete('/users/self/showings/credentials/')
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createCredential,
  createDuplicateCredential,
  createBadCredential,
  getCredential,
  updateCredential,
  deleteCredential
}