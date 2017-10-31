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

const verifyPhoneInvalidCode = (cb) => {
  return frisby.create('test phone verification with invalid code')
    .patch('/users/phone_confirmed', {
      phone_number: results.authorize.token.data.phone_number,
      code: 'bombasticCode'
    })
    .after(cb)
    .expectStatus(403)
}

const verifyPhoneInvalidPhone = (cb) => {
  return frisby.create('test phone verification with invalid phone number')
    .patch('/users/phone_confirmed', {
      phone_number: results.user.create.data.phone_number,
      code: '12345'
    })
    .after(cb)
    .expectStatus(403)
}

const verifyPhoneMissingPhone = (cb) => {
  return frisby.create('test phone verification phone missing')
    .patch('/users/phone_confirmed', {
      code: '12345'
    })
    .after(cb)
    .expectStatus(400)
}

const verifyPhoneMissingCode = (cb) => {
  return frisby.create('test phone verification code missing')
    .patch('/users/phone_confirmed', {
      phone_number: results.user.create.data.phone_number,
    })
    .after(cb)
    .expectStatus(400)
}

const verifyPhone = (cb) => {
  return frisby.create('test phone verification')
    .patch('/users/phone_confirmed', {
      phone_number: results.authorize.token.data.phone_number,
      code: '12345'
    })
    .after(cb)
    .expectStatus(200)
}

const verifyEmailInvalidCode = (cb) => {
  return frisby.create('test email verification with invalid code')
    .patch('/users/email_confirmed', {
      email: results.authorize.token.data.email,
      email_code: 'bombasticCode'
    })
    .after(cb)
    .expectStatus(403)
}

const verifyEmailInvalidEmail = (cb) => {
  return frisby.create('test email verification with invalid email')
    .patch('/users/email_confirmed', {
      email: results.user.create.data.email,
      email_code: 'a'
    })
    .after(cb)
    .expectStatus(403)
}

const verifyEmailMissingEmail = (cb) => {
  return frisby.create('test email verification phone missing')
    .patch('/users/phone_confirmed', {
      email_code: '12345'
    })
    .after(cb)
    .expectStatus(400)
}

const verifyEmailMissingCode = (cb) => {
  return frisby.create('test email verification code missing')
    .patch('/users/email_confirmed', {
      email: results.user.create.data.phone_number,
    })
    .after(cb)
    .expectStatus(400)
}

const verifyEmail = (cb) => {
  return frisby.create('test email verification')
    .patch('/users/email_confirmed', {
      email: results.authorize.token.data.email,
      email_code: 'a'
    })
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  createPhoneVerification,
  verifyPhoneInvalidCode,
  verifyPhoneInvalidPhone,
  verifyPhoneMissingCode,
  verifyPhoneMissingPhone,
  verifyPhone,
  createEmailVerification,
  verifyEmailInvalidCode,
  verifyEmailInvalidEmail,
  verifyEmailMissingCode,
  verifyEmailMissingEmail,
  verifyEmail
}
