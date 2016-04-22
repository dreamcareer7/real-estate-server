registerSuite('user', ['create']);

var createPhoneVerification = (cb) => {
  return frisby.create('create verification')
    .post('/phone_verifications')
    .after(cb)
    .expectStatus(204);
};

var createEmailVerification = (cb) => {
  return frisby.create('create verification')
    .post('/email_verifications')
    .after(cb)
    .expectStatus(204);
};

var verifyPhone = (cb) => {
  return frisby.create('create verification')
    .post('/email_verifications')
    .after(cb)
    .expectStatus(204);
};

module.exports = {
  createPhoneVerification,
  createEmailVerification
};
