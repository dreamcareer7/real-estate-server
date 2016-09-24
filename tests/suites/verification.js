registerSuite('user', ['create'])

const createPhoneVerification = (cb) => {
  return frisby.create('create verification')
    .post('/phone_verifications')
    .after(cb)
    .expectStatus(204)
}

const createEmailVerification = (cb) => {
  return frisby.create('create verification')
    .post('/email_verifications')
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  createPhoneVerification,
  createEmailVerification
}
