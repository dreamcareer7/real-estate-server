const async = require('async')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const config = require('../../config.js')
const db = require('../../utils/db.js')

const { mjml: render_mjml } = require('../../utils/render')
const Activity = require('../Activity')
const Context = require('../Context')
const Crypto = require('../Crypto')
const Url = require('../Url')
const Email = require('../Email')

const {
  get: getUser,
  getByEmail,
  getByPhoneNumber
} = require('./get')

const { shouldTryEmail } = require('./notification')

const {
  confirmEmail,
  confirmPhone
} = require('./confirm')

/**
 * Checks whether a `user` object's password has the same _bcrypt_ hash as the supplied password
 * @param {{password: string}} user - full user object
 * @param {string} password - password to be verified
 * @param {Callback<boolean>} cb - callback function
 */
const verifyPassword = function(user, password, cb) {
  if (!user.password)
    return cb('User has no password set')

  // FIXME
  // This is an open bug on node.bcrypt.js
  // https://github.com/ncb000gt/node.bcrypt.js/issues/235
  const c = Context.getActive()
  bcrypt.compare(password, user.password, (err, ok) => {
    if (c) c.enter()

    if (err) return cb(err)

    return cb(null, ok)
  })
}

/**
 * Updates the _bcrypt_ hashed password for a `user` object
 * @param {{id: UUID; password: string; }} arg1
 * @param {Callback<any>} cb - callback function
 */
const updatePassword = function({ id, password }, cb) {
  hashPassword(password, (err, hashed) => {
    if (err) return cb(err)

    db.query('user/change_password', [id, hashed], cb)
  })
}

/**
 * Triggers the flow of password change. It checks whether `old_password`
 * matches current password of the `user`, then replaces current password with the
 * supplied `new_password` argument
 * @param {UUID} user_id - ID of the referenced user
 * @param {string} old_password - current password for the user
 * @param {string} new_password - new password for the user
 * @param {Callback<boolean>} cb - callback function
 */
const changePassword = function(user_id, old_password, new_password, cb) {
  getUser(user_id).nodeify((err, user) => {
    if (err) return cb(err)

    /*
     * User has not defined any password yet.
     * This happens in case of Shadow users or SSO users.
     * No need to verify his password.
     */

    if (!user.password)
      return updatePassword(
        {
          id: user_id,
          password: new_password
        },
        cb
      )

    verifyPassword(user, old_password, (err, ok) => {
      if (err) return cb(err)

      if (!ok) return cb(Error.Forbidden('Invalid credentials'))

      return updatePassword(
        {
          id: user_id,
          password: new_password
        },
        cb
      )
    })
  })
}

/**
 * Creates a _bcrypt_ hash of the supplied password
 * @param {string} password - password to be hashed
 * @param {Callback<string>} cb - callback function
 */
const hashPassword = function(password, cb) {
  // FIXME
  // This is an open bug on node.bcrypt.js
  // https://github.com/ncb000gt/node.bcrypt.js/issues/235
  const c = Context.getActive()
  bcrypt.hash(password, 5, (err, res) => {
    if (c) c.enter()

    if (err) return cb(err)

    return cb(null, res)
  })
}

/**
 * This method initiates a password recovery flow for a user. We create a string consisting of their email
 * and a random token and encrypt the whole thing. We then send this token as a query string link to our own
 * password recovery app using email. When the user clicks on the link, they get redirected to our password
 * recovery app which asks them about a new password. This is a fairly straightforward and common process.
 * @param {string} email - email of the referenced user
 * @param {Callback<boolean>} cb - callback function
 */
const initiatePasswordReset = function(email, cb) {
  getByEmail(email).nodeify((err, user) => {
    if (err) return cb(err)

    if (!user) return cb(Error.ResourceNotFound('User not found'))

    if (user.is_shadow)
      return cb(
        Error.Forbidden(
          'Cannot request a reset password for a shadow user. You must complete your sign up through activation process first.'
        )
      )

    const token =
      process.env.NODE_ENV === 'tests'
        ? 'a'
        : crypto.randomBytes(20).toString('hex')

    // @ts-ignore
    db.query('user/record_pw_recovery', [email, user.id, token], (err, res) => {
      if (err) return cb(err)

      const getToken = (cb, results) => {
        const pw_token_plain = JSON.stringify({
          email: email,
          token: token
        })

        const pw_token = Crypto.encrypt(pw_token_plain)

        cb(null, pw_token)
      }

      const getUrl = (cb, results) => {
        const url = Url.web({
          uri: '/reset_password',
          query: {
            token: results.token
          }
        })
        cb(null, url)
      }

      const renderHTML = (cb, results) => {
        const template = __dirname + '/../../mjml/user/password_recovery.mjml'
        render_mjml(template, results, cb)
      }

      const sendEmail = (cb, results) => {
        if (!shouldTryEmail(results.user)) return cb()

        Email.create({
          from: config.email.from,
          to: [results.user.email],
          html: results.html,
          subject: 'Password Recovery'
        }).nodeify(cb)
      }

      async.auto(
        {
          user: cb => getUser(user.id).nodeify(cb),
          token: ['user', getToken],
          url: ['token', getUrl],
          html: ['url', renderHTML],
          send_email: ['html', sendEmail]
        },
        cb
      )
    })
  })
}

/**
 * This is almost always called by our password recovery app. It checks whether we have a record for password
 * recovery request for a certain user and checks that against the provided token. If all goes well, password
 * for the requesting user is changed.
 * @param {string} email - email of the referenced user
 * @param {string} token - token deciphered from the encrypted link in the email
 * @param {string} password - new password
 * @param {Callback<boolean>} cb - callback function
 */
const resetPassword = function(email, token, password, cb) {
  async.auto(
    {
      get: (cb, results) => {
        getByEmail(email).nodeify((err, user) => {
          if (err) return cb(err)

          if (!user) return cb(Error.ResourceNotFound('User not found'))

          return cb(null, user)
        })
      },
      check: [
        'get',
        (cb, results) => {
          // @ts-ignore
          db.query('user/check_pw_reset_token', [email, token], (err, res) => {
            if (err) return cb(err)

            if (res.rows.length < 1) return cb(Error.Forbidden())

            return cb()
          })
        }
      ],
      update_password: [
        'get',
        'check',
        (cb, results) => {
          updatePassword(
            {
              id: results.get.id,
              password: password
            },
            cb
          )
        }
      ],
      html: [
        'update_password',
        (cb, results) => {
          const template =
            __dirname + '/../../mjml/user/password_recovery_done.mjml'
          render_mjml(template, results, cb)
        }
      ],
      email: [
        'html',
        (cb, results) => {
          Email.create({
            from: config.email.from,
            to: [email],
            html: results.html,
            subject: 'Password Recovery'
          }).nodeify(cb)
        }
      ],
      cleanup: [
        'email',
        (cb, results) => {
          db.query('user/remove_pw_reset_token', [email, token], cb)
        }
      ]
    },
    cb
  )
}

/**
 * @param {IUserBase & { token: string }} arg1
 * @param {Callback<unknown>} cb
 */
const resetPasswordByShadowToken = function(
  { email, phone_number, token, password },
  cb
) {
  async.auto(
    {
      user: cb => {
        if (email) {
          getByEmail(email).nodeify((err, user) => {
            if (err) return cb(err)

            if (!user) return cb(Error.ResourceNotFound('User not found'))

            return cb(null, user)
          })
        } else if (phone_number) {
          getByPhoneNumber(phone_number).nodeify((err, user) => {
            if (err) return cb(err)

            if (!user) return cb(Error.ResourceNotFound('User not found'))

            return cb(null, user)
          })
        } else {
          return cb(
            Error.NotAcceptable(
              'Either a phone number or an email is required to make a password reset'
            )
          )
        }
      },
      check: [
        'user',
        cb => {
          if (email) {
            // @ts-ignore
            db.query(
              'user/check_shadow_token_email',
              [email, token],
              (err, res) => {
                if (err) return cb(err)
                else if (res.rows.length < 1)
                  return cb(Error.Forbidden('Invalid credentials'))

                return cb()
              }
            )
          } else if (phone_number) {
            // @ts-ignore
            db.query(
              'user/check_shadow_token_phone',
              [phone_number, token],
              (err, res) => {
                if (err) return cb(err)
                else if (res.rows.length < 1)
                  return cb(Error.Forbidden('Invalid credentials'))

                return cb()
              }
            )
          } else {
            return cb(
              Error.NotAcceptable(
                'Either an email or a phone number is required to make a password reset'
              )
            )
          }
        }
      ],
      update_password: [
        'user',
        'check',
        (cb, results) => {
          return updatePassword(
            {
              id: results.user.id,
              password: password
            },
            cb
          )
        }
      ],
      confirm: [
        'user',
        'check',
        'update_password',
        (cb, results) => {
          if (email) {
            return confirmEmail(results.user.id, cb)
          } else if (phone_number) {
            return confirmPhone(results.user.id, cb)
          }

          return cb(
            Error.NotAcceptable(
              'Either an email or a phone number is required to make a password reset'
            )
          )
        }
      ],
      signup_activity: [
        'user',
        'check',
        'update_password',
        (cb, results) => {
          if (!results.user.is_shadow) return cb()

          const activity = {
            action: 'UserSignedUp',
            object: results.user.id,
            object_class: 'user'
          }

          Activity.add(results.user.id, 'User', activity, cb)
        }
      ]
    },
    cb
  )
}

module.exports = {
  verifyPassword,
  changePassword,
  hashPassword,
  initiatePasswordReset,
  resetPassword,
  resetPasswordByShadowToken,
}
