const async = require('async')
const validator = require('../utils/validator.js')
const expect = require('../utils/validator.js').expect

const upgrade_schema = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      uuid: true,
      required: true
    },
    secret: {
      type: 'string',
      required: true
    }
  }
}

/**
 * Creates a `User` object
 * @name createUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary POST /users
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createUser (req, res) {
  const user = req.body

  expect(user.email).to.be.a('string').and.to.have.length.above('5')

  User.getByEmail(user.email, (err, current) => {
    if (err)
      return res.error(err)

    if (!current) {
      User.create(user, function (err, id) {
        if (err)
          return res.error(err)

        User.get(id, function (err, user) {
          if (err)
            return res.error(err)

          res.status(201)
          return res.model(user)
        })
      })
    } else if (current.is_shadow) {
      async.auto({
        agent: cb => {
          if (!user.actions)
            return cb()

          async.map(user.actions, (r, cb) => {
            if (!r.agent)
              return cb()

            return cb(null, r.agent)
          }, (err, results) => {
            if (err)
              return cb(err)

            return cb(null, results[0] || null)
          })
        },
        send_activation: [
          'agent',
          (cb, results) => {
            let context = false

            if (results.agent) {
              context = {
                agent: results.agent
              }
            }

            return User.sendActivation(current.id, context, cb)
          }
        ]
      }, (err, results) => {
        if (err)
          return res.error(err)

        res.status(202)
        return res.json(
          {
            data: {
              type: 'user_reference',
              id: current.id,
              created_at: current.created_at,
              updated_at: current.updated_at,
              email_confirmed: current.email_confirmed,
              email: current.email
            },
            code: 'OK'
          }
        )
      })
    } else {
      return res.error(Error.Conflict({
        details: {
          attributes: {
            email: 'Provided email already exists'
          }
        }
      }))
    }
  })
}

/**
 * Retrieves a `User` object
 * @name getUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary GET /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function getUser (req, res) {
  const user_id = req.params.id

  expect(user_id).to.be.uuid

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    res.model(user)
  })
}

function getSelf (req, res) {
  res.model(req.user)
}

/**
 * Patches a `User` object using partial parameters
 * @name patchUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function patchUser (req, res) {
  const user_id = req.user.id

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    const data = user
    for (const i in req.body)
      data[i] = req.body[i]

    // Amanda considers null !== undefined
    // That means while phone_number is optional, providing is as null would throw an error
    // Next two lines mean phone_number could be dupplied as null and would be treated as undefined
    if (data.phone_number === null)
      delete data.phone_number

    User.patch(user_id, data, function (err) {
      if (err)
        return res.error(err)

      User.get(user_id, function (err, user) {
        if (err)
          return res.error(err)

        res.model(user)
      })
    })
  })
}

/**
 * Deletes a `User` object
 * @name deleteUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary DELETE /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteUser (req, res) {
  const user_id = req.user.id

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    User.delete(user_id, function (err) {
      if (err) {
        return res.error(err)
      }

      res.status(204)
      res.end()
    })
  })
}

/**
 * Changes `User` password
 * @name changePassword
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id/password
 * @param {request} req - request object
 * @param {response} res - response object
 */
function changePassword (req, res) {
  const user_id = req.user.id
  const old_password = req.body.old_password || ''
  const new_password = req.body.new_password || ''

  expect(new_password).to.be.a('string').and.to.have.length.above('5')

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    User.changePassword(user_id, old_password, new_password, function (err, user) {
      if (err)
        return res.error(err)

      res.status(200)
      res.end()
    })
  })
}

/**
 * Sets an `Address` for a `User`
 * @name setAddress
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id/address
 * @param {request} req - request object
 * @param {response} res - response object
 */
function setAddress (req, res) {
  const user_id = req.user.id
  const address = req.body

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    User.setAddress(user_id, address, function (err, address_id) {
      if (err)
        return res.error(err)

      User.get(user_id, function (err, user) {
        if (err)
          return res.error(err)

        res.status(200)
        res.model(user)
      })
    })
  })
}

/**
 * Unsets the `Address` for a `User`
 * @name deleteAddress
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary DELETE /users/:id/address
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteAddress(req, res) {
  const user_id = req.user.id

  User.get(user_id, (err, user) => {
    if (err)
      return res.error(err)

    User.unsetAddress(user_id, (err) => {
      if (err)
        return res.error(err)

      User.get(user_id, (err, user) => {
        if(err)
          return res.error(err)

        res.status(200)
        res.model(user)
      })
    })
  })
}

/**
 * Searches for a `User` based on user code or email
 * @name search
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary GET /users/search
 * @param {request} req - request object
 * @param {response} res - response object
 */
function search (req, res) {
  const terms = req.query.q
  const limit = req.query.limit || 5
  const similar = (req.query.similar === 'true')
  const similarity = req.query.similarity || 0.04

  expect(limit).not.to.be.NaN
  expect(terms).to.be.an('array').and.not.to.be.empty

  if (similar) {
    User.stringSearchFuzzy(terms, limit, similarity, (err, users) => {
      if (err) {
        return res.error(err)
      }

      return res.collection(users)
    })
  } else {
    User.stringSearch(terms, limit, (err, users) => {
      if (err) {
        return res.error(err)
      }

      return res.collection(users)
    })
  }
}

function InitiatePasswordReset (req, res) {
  const email = req.body.email

  User.initiatePasswordReset(email, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function passwordReset (req, res) {
  const email = req.body.email
  const phone_number = req.body.phone_number
  const token = req.body.token
  const shadow_token = req.body.shadow_token
  const password = req.body.password
  const agent = req.body.agent

  const upgrade = agent && shadow_token

  if (token) {
    User.resetPassword(email, token, password, err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  } else if (shadow_token && email) {
    async.auto({
      user: cb => {
        return User.getByEmail(email, cb)
      },
      reset_password: [
        'user',
        (cb, results) => {
          if (!results.user)
            return cb(Error.Validation(`User with email ${email} not found`))

          return User.resetPasswordByShadowToken(email, null, shadow_token, password, cb)
        }
      ],
      upgrade: [
        'user',
        'reset_password',
        (cb, results) => {
          if (!upgrade)
            return cb()

          return User.upgradeToAgentWithToken(results.user.id, shadow_token, agent, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  } else if (shadow_token && phone_number) {
    async.auto({
      user: cb => {
        return User.getByPhoneNumber(phone_number, cb)
      },
      reset_password: [
        'user',
        (cb, results) => {
          if (!results.user)
            return cb(Error.Validation(`User with phone number ${phone_number} not found`))

          return User.resetPasswordByShadowToken(null, phone_number, shadow_token, password, cb)
        }
      ],
      upgrade: [
        'user',
        'reset_password',
        (cb, results) => {
          if(!upgrade)
            return cb()

          return User.upgradeToAgentWithToken(results.user.id, shadow_token, agent, cb)
        }
      ]
    }, (err, results) => {
      if(err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  } else {
    return res.error(Error.Validation('Password reset is done either by a reset token or a shadow token'))
  }
}

function patchUserTimeZone (req, res) {
  const user_id = req.user.id
  const timezone = req.body.time_zone

  User.patchTimeZone(user_id, timezone, function (err, ok) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function patchUserAvatars (req, res, type, link) {
  const user_id = req.user.id

  User.patchAvatars(user_id, type, link, function (err) {
    if (err)
      return res.error(err)

    User.get(user_id, function (err, user) {
      if (err)
        return res.error(err)

      return res.model(user)
    })
  })
}

function patchUserProfileImage (req, res) {
  return patchUserAvatars(req, res, 'Profile', req.body.profile_image_url)
}

function patchUserCoverImage (req, res) {
  return patchUserAvatars(req, res, 'Cover', req.body.cover_image_url)
}

function upgrade (req, res) {
  const user_id = req.user.id
  const agent_id = req.body.agent
  const secret = req.body.secret

  async.auto({
    validate: cb => {
      return validator(upgrade_schema, req.body, cb)
    },
    audit: [
      'validate',
      cb => {
        Agent.auditSecret(agent_id, secret, cb)
      }
    ],
    upgrade: [
      'validate',
      'audit',
      cb => {
        User.upgradeToAgent(user_id, agent_id, cb)
      }
    ],
    user: [
      'validate',
      'audit',
      'upgrade',
      cb => {
        User.get(user_id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return res.error(err)

    return res.model(results.user)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.patch('/users/self/profile_image_url', b(patchUserProfileImage))
  app.patch('/users/self/cover_image_url', b(patchUserCoverImage))
  app.patch('/users/self/timezone', b(patchUserTimeZone))
  app.patch('/users/self/upgrade', b(upgrade))
  app.post('/users', app.auth.clientPassword(createUser))
  app.get('/users/search', b(search))
  app.patch('/users/password', passwordReset)
  app.post('/users/reset_password', InitiatePasswordReset)
  app.get('/users/self', b(getSelf))
  app.get('/users/:id', getUser)
  app.put('/users/self', b(patchUser))
  app.patch('/users/self/password', b(changePassword))
  app.delete('/users/self', b(deleteUser))
  app.put('/users/self/address', b(setAddress))
  app.delete('/users/self/address', b(deleteAddress))
}

module.exports = router
