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
    .get('/verifications/' + results.verification.create.id + '/users/' + results.user.create.data.id)
    .after(cb)
    .expectStatus(200);
}

var get = (cb) => {
  return frisby.create('get code')
    .get('/verifications/' + results.verification.create.id)
    .after(cb)
    .expectStatus(200);
}

module.exports = {
  create,
  verify,
  get: get
}
