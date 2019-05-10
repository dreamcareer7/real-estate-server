const showings_credential = require('./expected_objects/showings_credential.js')


registerSuite('agent', ['add'])



function createCredential(cb) {
  const body = {
    agent: results.agent.add,
    username: 'username',
    password: 'password'
  }

  return frisby.create('create a showings credential')
    .post('/showings/credential', body)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function getCredential(cb) {
  const credentialId = results.showings.createCredential.data.id

  return frisby.create('get a showings credential')
    .get(`/showings/credential/${credentialId}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: showings_credential
    })
}

function getCredentialByAgent(cb) {
  return frisby.create('get a showings credential by agent id')
    .get(`/showings/credential/agent/${results.agent.add}`)
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
    .put(`/showings/credential/${credentialId}`, body)
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
    .delete(`/showings/credential/${credentialId}`)
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  createCredential,
  getCredential,
  getCredentialByAgent,
  updateCredential,
  deleteCredential
}