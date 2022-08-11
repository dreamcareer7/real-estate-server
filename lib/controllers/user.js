const async = require('async')
const config = require('../config')
const validator = require('../utils/validator.js')
const expect = require('../utils/validator.js').expect
const am = require('../utils/async_middleware.js')
const moment = require('moment-timezone')

const Brand = require('../models/Brand')
const User = require('../models/User')
const UserSettings = require('../models/User/setting')
const AttachedFile = require('../models/AttachedFile')
const SsoProvider = require('../models/User/sso')
const UserRole = require('../models/User/role')
const Agent = require('../models/Agent')

const { uniqBy } = require('lodash')

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const add_agent_schema = {
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

  expect(user.email).to.be.a('string').and.to.have.length.above(5)

  User.getByEmail(user.email).nodeify((err, current) => {
    if (err)
      return res.error(err)

    if (!current) {
      User.create(user, function (err, id) {
        if (err)
          return res.error(err)

        User.get(id).nodeify(function (err, user) {
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
              email: current.email,
              created_at: current.created_at,
              updated_at: current.updated_at,
              email_confirmed: current.email_confirmed,
              phone_confirmed: current.phone_confirmed,
              is_shadow: current.is_shadow,
              fake_email: current.fake_email
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
        },
        slack: false,
        skip_trace_log: true,
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
 */
function getUser (req, res) {
  const user_id = req.params.id

  expect(user_id).to.be.uuid

  User.get(user_id).nodeify(function (err, user) {
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
 * @summary PATCH /users/self
 * @param {request} req - request object
 * @param {response} res - response object
 */
function patchUser (req, res) {
  const user_id = req.user.id

  User.get(user_id).nodeify(function (err, user) {
    if (err)
      return res.error(err)

    const data = user
    for (const i in req.body)
      data[i] = req.body[i]

    // Amanda considers null !== undefined
    // That means while phone_number is optional, providing it as null would throw an error
    // Next two lines mean phone_number could be supplied as null and would be treated as undefined
    if (data.phone_number === null)
      delete data.phone_number

    User.patch(user_id, data, function (err) {
      if (err)
        return res.error(err)

      User.get(user_id).nodeify(function (err, user) {
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

  User.get(user_id).nodeify(function (err, user) {
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

  expect(new_password).to.be.a('string').and.to.have.length.above(5)

  User.get(user_id).nodeify(function (err, user) {
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

function InitiatePasswordReset (req, res) {
  const email = req.body.email

  expect(email).to.be.a('string')

  User.initiatePasswordReset(email, err => {
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

  const add_agent = agent && shadow_token

  expect(password).to.be.a('string')

  if (!shadow_token && !token)
    throw new Error.Validation()

  async.auto({
    user_by_email: (cb, results) => {
      if(!email)
        return cb()

      User.getByEmail(email).nodeify(cb)
    },
    user_by_phone: (cb, results) => {
      if(!phone_number)
        return cb()

      User.getByPhoneNumber(phone_number).nodeify(cb)
    },
    user: [
      'user_by_email',
      'user_by_phone',
      (cb, results) => {
        if ((!(email || phone_number)) || (email && phone_number))
          return cb(Error.Validation('You must provide either an email address or a phone number'))

        if (email && !results.user_by_email)
          return cb(Error.ResourceNotFound(`User with email ${email} not found`))

        if (phone_number && !results.user_by_phone)
          return cb(Error.ResourceNotFound(`User with phone number ${phone_number} not found`))

        if (email && results.user_by_email.email && results.user_by_email.fake_email)
          return cb(Error.NotAcceptable('You may only reset a phone shadow user by providing a phone number'))

        return cb(null, results.user_by_email || results.user_by_phone)
      }
    ],
    reset_normal: (cb, results) => {
      if (!(token && email))
        return cb()

      User.resetPassword(email, token, password, cb)
    },
    reset_shadow: [
      'user_by_email',
      'user_by_phone',
      'user',
      (cb, results) => {
        if (!shadow_token)
          return cb()

        const data = {
          token: shadow_token,
          password: password
        }

        if(results.user_by_email)
          data.email = email

        if(results.user_by_phone)
          data.phone_number = phone_number

        User.resetPasswordByShadowToken(data, cb)
      }
    ],
    add_agent: [
      'user',
      'reset_normal',
      'reset_shadow',
      (cb, results) => {
        if (!add_agent)
          return cb()

        return User.addAgentWithToken(results.user.id, shadow_token, agent, cb)
      }
    ],
    get: [
      'user',
      'reset_normal',
      'reset_shadow',
      'add_agent',
      (cb, results) => {
        User.get(results.user.id).nodeify(cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err)

    return res.model(results.get)
  })
}

async function patchUserTimeZone (req, res) {
  const user_id = req.user.id
  const timezone = req.body.time_zone

  if (!moment.tz.zone(timezone)) {
    throw Error.Validation(`Timezone ${timezone} is not valid.`)
  }

  await User.patchTimeZone(user_id, timezone)

  const updated = await User.get(user_id)
  res.model(updated)
}

function patchUserAvatars (req, res, type) {
  const attach = cb => {
    AttachedFile.saveFromRequest({
      path: req.user.id,
      req,
      relations: [
        {
          role: 'User',
          role_id: req.user.id
        }
      ],
      public: true
    }, cb)
  }

  const patch = ({file}, cb) => {
    User.patchAvatars(req.user.id, type, file.url, cb)
  }

  const get = (patched, cb) => User.get(req.user.id).nodeify(cb)

  const done = (err, user) => {
    if (err)
      return res.error(err)

    return res.model(user)
  }

  async.waterfall([
    attach,
    patch,
    get,
  ], done)
}

function patchUserProfileImage (req, res) {
  return patchUserAvatars(req, res, 'Profile')
}

function patchUserCoverImage (req, res) {
  return patchUserAvatars(req, res, 'Cover')
}

function uploadEmailSignAttachments (req, res) {
  const path = `${req.user.id}/signatures`
  const fileSize = config.email_composer.signature_upload_limit

  AttachedFile.saveFromRequest({
    path: path,
    req,
    relations: [
      {
        role: 'User',
        role_id: req.user.id
      }
    ],
    public: true,
    busboyOptions: { limits: { fileSize } }
  }, function(err, {file} = {}) {
    if(err)
      return res.error(err)

    res.model(file)
  })
}

function addAgent (req, res) {
  const user_id = req.user.id
  const agent_id = req.body.agent
  const secret = req.body.secret

  async.auto({
    validate: cb => {
      return validator(add_agent_schema, req.body, cb)
    },
    audit: [
      'validate',
      cb => {
        Agent.auditSecret(agent_id, secret).nodeify(cb)
      }
    ],
    add_agent: [
      'validate',
      'audit',
      cb => {
        User.addAgent(user_id, agent_id, cb)
      }
    ],
    user: [
      'validate',
      'audit',
      'add_agent',
      cb => {
        User.get(user_id).nodeify(cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return res.error(err)

    return res.model(results.user)
  })
}

const getRoles = async (req, res) => {
  const roles = await UserRole.getForUser(req.user.id)
  res.collection(roles)
}

const updateSettings = async (req, res) => {
  const user_id = req.user.id
  const brand_id = getCurrentBrand()
  const { key } = req.params
  const { value } = req.body

  const ret = await UserSettings.update(
    user_id,
    brand_id,
    key,
    value
  )

  return res.json(ret)
}

const lookup = async (req, res) => {
  const { email } = req.body
  expect(email).to.be.a('string')

  const user = await User.getByEmail(email)
  const provider = await SsoProvider.getByEmail(email)


  /*
   * Cannot find this user and cannot find any SSO providers for her.
   */
  if (!user && !provider)
    throw new Error.ResourceNotFound(`No user found with email ${email}`)

  /*
   * User doesn't exist but there's an SSO provider who can help her log in.
   */
  if (!user && provider) {
    const info = {
      password: false,
      is_shadow: true,
      email_confirmed: false,
      fake_email: true,
      phone_confirmed: false
    }

    res.collection([provider], info)
    return
  }

  /*
   * We could find
   */
  const providers = [
    ...await SsoProvider.getByUser(user),
    provider
  ]
    .filter(Boolean)

  const info = {
    password: Boolean(user.password),
    is_shadow: Boolean(user.is_shadow),
    email_confirmed: Boolean(user.email_confirmed),
    fake_email: Boolean(user.fake_email),
    phone_confirmed: Boolean(user.phone_confirmed)
  }

  res.collection(uniqBy(providers, 'id'), info)
}

async function getBrands(req, res) {
  const user_id = req.user.id
  const brand_ids = await User.getUserBrands(user_id)
  const brands = await Brand.getAll(brand_ids)
  return res.collection(brands)
}

async function getActiveRole(req, res) {
  const active_role = await UserRole.getActive(req.user.id)
  if (!active_role) {
    return res.json({
      code: 'OK',
      data: null
    })
  }

  return res.model(active_role)
}

async function changeActiveBrand(req, res) {
  await UserSettings.touch(req.user.id, getCurrentBrand())

  res.status(204)
  res.end()
}

const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.post('/users/lookup', app.auth.clientPassword(am(lookup)))
  app.patch('/users/self/profile_image_url', auth, patchUserProfileImage)
  app.patch('/users/self/cover_image_url', auth, patchUserCoverImage)
  app.post('/users/self/email_signature_attachments', auth, uploadEmailSignAttachments)
  app.patch('/users/self/timezone', auth, am(patchUserTimeZone))
  app.post('/users/self/agents', auth, addAgent)
  app.post('/users', app.auth.clientPassword(createUser))
  app.patch('/users/password', passwordReset)
  app.post('/users/reset_password', InitiatePasswordReset)
  app.get('/users/self', auth, getSelf)
  app.get('/users/:id', auth, getUser)
  app.put('/users/self', auth, patchUser)
  app.patch('/users/self/password', auth, changePassword)
  app.delete('/users/self', auth, deleteUser)
  app.get('/users/self/roles', auth, am(getRoles))
  app.get('/users/self/brands', auth, am(getBrands))
  app.get('/users/self/active-role', auth, am(getActiveRole))
  app.patch('/users/self/active-brand', auth, am(changeActiveBrand))
  app.put('/users/self/settings/:key', auth, am(updateSettings))
}

module.exports = router
