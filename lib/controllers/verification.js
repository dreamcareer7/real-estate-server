/**
 * @namespace controller/verification
 */

const async = require('async')
const validator = require('../utils/validator.js')

const email_verification_schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
      required: true
    },
    email_code: {
      type: 'string',
      required: true
    },
    agent: {
      type: 'string',
      uuid: true,
      required: false
    },
    token: {
      type: 'string',
      required: false
    }
  }
}

/**
 * Creates a `PhoneVerification` object
 * @name createPhoneVerification
 * @memberof controller/verification
 * @instance
 * @function
 * @public
 * @summary POST /phone_verifications
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createPhoneVerification (req, res) {
  const user_id = req.user.id

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    const verificationObject = {
      phone_number: user.phone_number
    }

    PhoneVerification.create(verificationObject, true, function (err, verification_id) {
      if (err)
        return res.error(err)

      PhoneVerification.get(verification_id, function (err) {
        if (err)
          return res.error(err)

        res.status(204)
        return res.end()
      })
    })
  })
}

/**
 * Creates a `EmailVerification` object
 * @name createEmailVerification
 * @memberof controller/verification
 * @instance
 * @function
 * @public
 * @summary POST /email_verifications
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createEmailVerification (req, res) {
  const user_id = req.user.id

  User.get(user_id, (err, user) => {
    if (err)
      return res.error(err)

    const verificationObject = {
      email: user.email
    }

    EmailVerification.create(verificationObject, true, (err, verification_id) => {
      if (err)
        return res.error(err)

      EmailVerification.get(verification_id, err => {
        if (err)
          return res.error(err)

        res.status(204)
        return res.end()
      })
    })
  })
}

function verifyEmailSA (req, res) {
  validator(email_verification_schema, req.body, err => {
    if (err)
      return res.error(err)

    const email = req.body.email
    const email_code = req.body.email_code
    const token = req.body.token
    const agent = req.body.agent

    const upgrade = token && agent

    async.auto({
      user: cb => {
        if (!upgrade)
          return cb()

        return User.getByEmail(email, cb)
      },
      upgrade: [
        'user',
        (cb, results) => {
          if (!upgrade)
            return cb()

          return User.upgradeToAgentWithToken(results.user.id, token, agent, cb)
        }
      ],
      audit: cb => {
        return EmailVerification.audit(email, email_code, cb)
      },
      get: [
        'user',
        'upgrade',
        'audit',
        (cb, results) => {
          return User.getByEmail(email, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return res.error(err)

      return res.model(results.get)
    })
  })
}

function verifyPhoneSA (req, res) {
  if (!req.body.phone_number)
    return res.error(Error.Validation('You must provide a phone number to verify'))

  if (!req.body.code)
    return res.error(Error.Validation('You must provide a code to verify your phone number'))

  const phone_number = req.body.phone_number
  const code = req.body.code

  PhoneVerification.audit(phone_number, code, function (err) {
    if (err)
      return res.error(err)

    User.getByPhoneNumber(phone_number, (err, user) => {
      if (err)
        return res.error(err)

      return res.model(user)
    })
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/phone_verifications', b(createPhoneVerification))
  app.post('/email_verifications', b(createEmailVerification))
  app.patch('/users/phone_confirmed', verifyPhoneSA)
  app.patch('/users/email_confirmed', verifyEmailSA)
}

module.exports = router
