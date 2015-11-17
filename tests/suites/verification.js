//register dependencies
registerSuite('user', ['create'])

var create = (cb) => {
  return frisby.create('create verification')
    .post('/verifications')
    .after(cb)
    .expectStatus(201)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'verification'
      }

    })
}

var verify = (cb) => {
  return frisby.create('verify code')
    .patch('/self/phone_verification?code=' + results.verification.create.data.code)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'verification'
      }
    })
}

module.exports = {
  create,
  verify
}
