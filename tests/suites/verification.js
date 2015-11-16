//register dependencies
registerSuite('user', ['create'])

var create = (cb) => {
  return frisby.create('create verification')
    .post('/verifications')
    .after(cb)
    .expectStatus(201);
}

var verify = (cb) => {
  return frisby.create('verify code')
    .get('/verifications/' + results.verification.create.code + '/users/' + results.verification.create.user_id)
    .after(cb)
    .expectStatus(200);
}

module.exports = {
  create,
  verify
}
