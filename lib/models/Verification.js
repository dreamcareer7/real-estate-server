/**
 * @namespace Verification
 */

const async = require('async')
const crypto = require('crypto')
const db = require('../utils/db.js')
const config = require('../config.js')
const debug = require('debug')('rechat:users')
const EventEmitter = require('events').EventEmitter
const render = require('../utils/render').html
const Branch = require('./Branch')

PhoneVerification = new EventEmitter()
EmailVerification = new EventEmitter()

Orm.register('phone_verification', 'PhoneVerification')
Orm.register('email_verification', 'EmailVerification')

/**
 * Inserts a `phone_verification` object into database
 * @memberof PhoneVerification
 * @instance
 * @public
 * @param {Verification#verification} verification - full verification object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `verification` object created
 */
PhoneVerification.create = function (user_id, cb) {
  const code = (process.env.NODE_ENV === 'tests') ? '12345' : Math.floor((Math.random() * 9000) + 1000).toString()

  async.auto({
    user: cb => {
      User.get(user_id).nodeify(cb)
    },
    validate: [
      'user',
      (cb, results) =>
      {
        if (!results.user.phone_number)
          return cb(Error.PreconditionFailed('This user does not have a phone number'))

        return cb()
      }
    ],
    insert: [
      'user',
      'validate',
      (cb, results) => {
        return db.query('verification/phone_insert', [code, results.user.phone_number], cb)
      }
    ],
    branch: [
      'user',
      'validate',
      (cb, results) => {
        const data = {}

        data.phone_code = code
        data.phone_number = results.user.phone_number
        data.receiving_user = results.user.id

        data.action = 'PhoneVerification'

        const url = Url.web({
          uri: '/branch'
        })

        data['$desktop_url'] = url
        data['$fallback_url'] = url

        Branch.createURL(data).nodeify(cb)
      }
    ],
    render: [
      'branch',
      (cb, results) => {
        render(__dirname + '/../templates/verifications/phone.tmpl', {
          code: code,
          branch: results.branch
        }, cb)
      }
    ],
    sms: [
      'user',
      'branch',
      'validate',
      'insert',
      'render',
      (cb, results) => {
        SMS.send({
          from: config.twilio.from,
          to: results.user.phone_number,
          body: results.render,
        }, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    PhoneVerification.emit('phone verification sent', {
      id: results.user.id,
      phone_number: results.user.phone_number
    })

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
 * Inserts a `EmailVerification` object into database
 * @memberof EmailVerification
 * @instance
 * @public
 * @param {EmailVerification#email_verification} verification - full verification object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `verification` object created
 */
EmailVerification.create = function (user_id, cb) {
  const code = (process.env.NODE_ENV === 'tests') ? 'a' : crypto.randomBytes(16).toString('hex')

  async.auto({
    user: cb => {
      User.get(user_id).nodeify(cb)
    },
    validate: [
      'user',
      (cb, results) => {
        if (!results.user.email)
          return cb(Error.PreconditionFailed('This user does not have an email'))

        if (results.user.fake_email)
          return cb(Error.PreconditionFailed('This user does not have a valid email address'))

        return cb()
      }
    ],
    insert: [
      'user',
      'validate',
      (cb, results) => {
        return db.query('verification/email_insert', [code, results.user.email], cb)
      }
    ],
    agent: [
      'user',
      'validate',
      (cb, results) => {
        Agent.matchByEmail(results.user.email).nodeify(cb)
      }
    ],
    branch: [
      'user',
      'validate',
      (cb, results) => {
        const data = {}

        data.email = results.user.email
        data.receiving_user = results.user.id
        data.token = results.user.secondary_password
        data.email_code = code

        if (results.agent) {
          debug('>>> (Verification::email::branch) Matched agent id:', results.agent, 'for this user:', results.user.id)
          data.agent = results.agent
        }

        data.action = 'EmailVerification'

        const url = Url.web({
          uri: '/branch',
        })

        data['$desktop_url'] = url
        data['$fallback_url'] = url

        Branch.createURL(data).nodeify(cb)
      }
    ],
    html: [
      'branch',
      (cb, results) => {
        results.base_url = Url.web({})

        const template = __dirname + '/../html/user/email_verification.html'
        render(template, results, cb)
      }
    ],
    email: [
      'user',
      'branch',
      'validate',
      'insert',
      'html',
      (cb, results) => {

        return Email.create({
          from: config.email.from,
          to: [results.user.email],
          html: results.html,
          subject: 'Email Verification'
        }).nodeify(cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    EmailVerification.emit('email verification sent', {
      id: results.user.id,
      email: results.user.email
    }, results.email)

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

module.exports = function () {}
