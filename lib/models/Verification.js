/**
 * @namespace Verification
 */

const async = require('async')
const crypto = require('crypto')
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const config = require('../config.js')
const debug = require('debug')('rechat:users')
const EventEmitter = require('events').EventEmitter

PhoneVerification = new EventEmitter()
EmailVerification = new EventEmitter()

Orm.register('phone_verification', PhoneVerification)
Orm.register('email_verification', EmailVerification)

const schema_phone = {
  type: 'object',
  properties: {
    phone_number: {
      required: true,
      type: 'string'
    }
  }
}

const schema_email = {
  type: 'object',
  properties: {
    email: {
      required: true,
      type: 'string'
    }
  }
}

const html_body = require('../html/email.html')
const text_phone_verification = require('../asc/user/phone_verification.asc')
const text_subject_email_verification = require('../asc/user/subject_email_verification.asc')
const text_email_verification = require('../asc/user/email_verification.asc')
const html_email_verification = require('../html/user/email_verification.html')

/**
 * Inserts a `phone_verification` object into database
 * @memberof PhoneVerification
 * @instance
 * @public
 * @param {Verification#verification} verification - full verification object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `verification` object created
 */
PhoneVerification.create = function (verification, notify, cb) {
  verification.code = Math.floor((Math.random() * 9000) + 1000).toString()

  async.auto({
    validate: function (cb) {
      if (!verification.phone_number)
        return cb(Error.PreconditionFailed('This user does not have a phone number'))

      return validator(schema_phone, verification, cb)
    },
    insert: [
      'validate',
      cb => {
        return db.query('verification/phone_insert', [verification.code, verification.phone_number], cb)
      }
    ],
    branch: [
      'validate',
      (cb, results) => {
        const data = {}

        data.phone_code = verification.code
        data.phone_number = verification.phone_number

        const token_plain = JSON.stringify(data)
        const token = Crypto.encrypt(token_plain)

        data.action = 'PhoneVerification'

        const url = Url.create({
          uri: '/verify_phone',
          query: {
            token: token
          }
        })

        data['$desktop_url'] = url
        data['$fallback_url'] = url

        Branch.createURL(data, cb)
      }
    ],
    sms: [
      'branch',
      'validate',
      'insert',
      (cb, results) => {
        if (!notify)
          return cb()

        SMS.send({
          from: config.twilio.from,
          to: verification.phone_number,
          body: text_phone_verification,
          template_params: {
            code: verification.code,
            branch_url: results.branch
          }
        }, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    PhoneVerification.emit('phone verification sent', verification)
    return cb(null, results.insert.rows[0].id)
  })
}

/**
 * Validates a `EmailVerification` object
 * @name verify
 * @function
 * @memberof PhoneVerification
 * @instance
 * @public
 * @param {string} phone_number - Phone number of the verification owner
 * @param {code} code - verification code being verified
 * @param {callback} cb - callback function
 * @returns {PhoneVerification#phone_verification}
 */
PhoneVerification.audit = function (phone_number, code, cb) {
  if (!phone_number)
    return cb(Error.Forbidden('No phone numbers are registered for this user'))

  db.query('verification/phone_verify', [code, phone_number], (err, res) => {
    if (err)
      return cb(err)

    if (res.rowCount < 1)
      return cb(Error.Forbidden('Invalid code'))

    PhoneVerification.emit('phone verified', phone_number)
    return cb()
  })
}

/**
 * Retrieves a full `PhoneVerification` object
 * @name get
 * @function
 * @memberof PhoneVerification
 * @instance
 * @public
 * @param {uuid} verification_id - ID of the verification being retrieved
 * @param {callback} cb - callback function
 * @returns {PhoneVerification#phone_verification}
 */
PhoneVerification.get = function (verification_id, cb) {
  db.query('verification/phone_get', [verification_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Verification object not found'))

    const verification = res.rows[0]
    return cb(null, verification)
  })
}

/**
 * Inserts a `EmailVerification` object into database
 * @memberof EmailVerification
 * @instance
 * @public
 * @param {EmailVerification#email_verification} verification - full verification object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `verification` object created
 */
EmailVerification.create = function (verification, notify, cb) {
  verification.code = crypto.randomBytes(16).toString('hex')

  async.auto({
    validate: cb => {
      return validator(schema_email, verification, cb)
    },
    insert: [
      'validate',
      cb => {
        return db.query('verification/email_insert', [verification.code, verification.email], cb)
      }
    ],
    user: [
      'validate',
      (cb, results) => {
        return User.getByEmail(verification.email, cb)
      }
    ],
    agent: [
      'validate',
      cb => {
        Agent.matchByEmail(verification.email, cb)
      }
    ],
    branch: [
      'validate',
      'user',
      (cb, results) => {
        const data = {}

        data.email = verification.email
        data.email_code = verification.code
        data.token = results.user.secondary_password

        if (results.agent) {
          debug('>>> (Verification::email::branch) Matched agent id:', results.agent, 'for this user:', results.user.id)
          data.agent = results.agent
        }

        const token_plain = JSON.stringify(data)
        const token = Crypto.encrypt(token_plain)

        data.action = 'EmailVerification'

        const url = Url.create({
          uri: '/verify_email',
          query: {
            token: token
          }
        })

        data['$desktop_url'] = url
        data['$fallback_url'] = url

        Branch.createURL(data, cb)
      }
    ],
    email: [
      'user',
      'branch',
      'validate',
      'insert',
      (cb, results) => {
        if (!notify)
          return cb()

        return Email.send({
          transport: 'ses',
          from: config.email.from,
          to: [ verification.email ],
          source: config.email.source,
          html_body: html_body,
          message: {
            body: {
              html: {
                data: html_email_verification
              },
              text: {
                data: text_email_verification
              }
            },
            subject: {
              data: text_subject_email_verification
            }
          },
          template_params: {
            branch_url: results.branch,
            first_name: results.user ? results.user.first_name : '',
            base_url: Url.create({}),
            _title: 'Email Verification'
          }
        }, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    EmailVerification.emit('email verification sent', verification, results.email)
    return cb(null, results.insert.rows[0].id)
  })
}

/**
 * Validates a `EmailVerification` object
 * @name verify
 * @function
 * @memberof EmailVerification
 * @instance
 * @public
 * @param {string} email - Email of the verification owner
 * @param {code} code - verification code being verified
 * @param {callback} cb - callback function
 * @returns {EmailVerification#email_verification}
 */
EmailVerification.audit = function (email, code, cb) {
  db.query('verification/email_verify', [code, email], function (err, res) {
    if (err)
      return cb(err)

    if (res.rowCount < 1)
      return cb(Error.Forbidden('Invalid code'))

    EmailVerification.emit('email verified', email)
    return cb()
  })
}

/**
 * Retrieves a full `EmailVerification` object
 * @name get
 * @function
 * @memberof EmailVerification
 * @instance
 * @public
 * @param {uuid} verification_id - ID of the verification being retrieved
 * @param {callback} cb - callback function
 * @returns {EmailVerification#email_verification}
 */
EmailVerification.get = function (verification_id, cb) {
  db.query('verification/email_get', [verification_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Verification object not found'))

    const verification = res.rows[0]
    return cb(null, verification)
  })
}

PhoneVerification.publicize = function (model) {
  if (model.code) delete model.code
  if (model.phone_number) delete model.phone_number

  return model
}

EmailVerification.publicize = function (model) {
  if (model.code) delete model.code
  if (model.email) delete model.email

  return model
}

module.exports = function () {}
