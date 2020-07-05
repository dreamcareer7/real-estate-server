/**
 * @namespace User
 */

require('../../utils/require_asc.js')
require('../../utils/require_html.js')

const Orm = require('../Orm')
const ObjectUtil = require('../ObjectUtil')
const Branch = require('../Branch')
const Context = require('../Context')
const Url = require('../Url')
const SocketServer = require('../../socket')
const { EmailVerification, PhoneVerification } = require('../Verification')
const Token = require('../Token')

const validator = require('../../utils/validator.js')
const db = require('../../utils/db.js')
const async = require('async')
const queue = require('../../utils/queue.js')

const Emitter = require('../../utils/event_emitter')

const User = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./actions'),
  ...require('./password'),
  ...require('./create'),
  ...require('./confirm'),
  ...require('./references'),
  ...require('./notification')
}

Orm.register('user', 'User', User)

require('./role')
require('./sso')

const schema_patch = {
  type: 'object',
  properties: {
    password: {
      type: ['string', null],
      required: false
    },

    first_name: {
      type: 'string',
      required: true
    },

    last_name: {
      type: 'string',
      required: true
    },

    email: {
      type: ['string', null],
      format: 'email',
      required: false
    },

    phone_number: {
      type: ['string', null],
      phone: true,
      required: false
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent', 'Brokerage', 'Admin']
    },

    email_signature: {
      type: ['string', 'null'],
      required: false
    }
  }
}

const validate_patch = validator.bind(null, schema_patch)

/**
 * Updates a `user` object from database
 * @param {UUID} user_id - ID of the user being updated
 * @param {IUserInput} user - full user object
 * @param {Callback<any>} cb - callback function
 */
function update(user_id, user, cb) {
  // @ts-ignore
  db.query(
    'user/update',
    [
      user.first_name,
      user.last_name,
      user.email,
      user.phone_number,
      user.profile_image_url,
      user.cover_image_url,
      user.brand,
      user.is_shadow,
      user.email_signature,
      user.daily_enabled,
      user_id
    ],
    cb
  )
}

/**
 * Patches a `user` object with new data
 * @param {UUID} user_id - ID of the user being patched
 * @param {IUserInput} user - full user object
 * @param {Callback<any>} cb - callback function
 */
User.patch = function(user_id, user, cb) {
  /**
   * @param {Callback<IUser>} cb 
   */
  const email_owner = cb => {
    if (!user.email) return cb()

    User.getByEmail(user.email).nodeify((err, email_owner) => {
      if (err) return cb(err)

      if (email_owner && email_owner.id !== user_id) {
        return cb(
          Error.Conflict(
            'Provided email is already associated with another user'
          )
        )
      }

      cb(null, email_owner)
    })
  }

  /**
   * @param {Callback<IUser>} cb 
   */
  const phone_owner = cb => {
    if (!user.phone_number) return cb()

    /** @type {string} */
    const phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

    User.getByPhoneNumber(phone_number).nodeify((err, phone_owner) => {
      if (err) return cb(err)

      if (phone_owner && phone_owner.id !== user_id)
        return cb(
          Error.Conflict(
            'Provided phone number is already associated with another user'
          )
        )

      cb(null, phone_owner)
    })
  }

  /**
   * @param {Callback<UUID>} cb 
   * @param {{email_owner?: IUser}} results 
   */
  const email_verification = (cb, results) => {
    if (!user.email) return cb()

    if (results.email_owner && results.email_owner.id === user_id) return cb() // Email address not changed.

    EmailVerification.create(user_id, cb)
  }

  /**
   * @param {Callback<UUID>} cb 
   * @param {{phone_owner?: IUser}} results 
   */
  const phone_verification = (cb, results) => {
    if (!user.phone_number) return cb()

    if (results.phone_owner && results.phone_owner.id === user_id) return cb() // Phone number has changed

    PhoneVerification.create(user_id, cb)
  }

  if (user.phone_number)
    user.phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

  async.auto(
    {
      validate: cb => validate_patch(user, cb),
      email_owner: email_owner,
      phone_owner: phone_owner,
      update: [
        'validate',
        'email_owner',
        'phone_owner',
        cb => update(user_id, user, cb)
      ],
      email_verification: ['update', email_verification],
      phone_verification: ['update', phone_verification]
    },
    cb
  )
}

/**
 * Deletes a `user` object
 * @param {UUID} user_id - ID of the user being deleted
 * @param {Callback<any>} cb - callback function
 */
User.delete = function(user_id, cb) {
  db.query('user/delete', [user_id], cb)
}

/**
 * Updates a time zone information for a user
 * @param {UUID} user_id - ID of the referenced user
 * @param {string} timezone - new time zone string representation
 */
User.patchTimeZone = function(user_id, timezone) {
  return db.update('user/patch_timezone', [user_id, timezone])
}

/**
 * We have the policy of disabling push notification between 9:30 PM
 * and 8:30 AM. This should later turn into something more configurable.
 * @param {UUID} user_id - ID of the referenced user
 * @param {Callback<boolean>} cb - callback function
 */
User.isPushOK = function(user_id, cb) {
  User.get(user_id).nodeify(function(err, user) {
    if (err) return cb(err)

    // @ts-ignore
    db.query('user/ok_push', [user_id], function(err, res) {
      if (err) return cb(err)

      return cb(null, res.rows[0].remaining)
    })
  })
}

/**
 * Stripping the `User` object off of it's sensitive contents for public consumption
 * like password, email, etc.
 * @param {IUser} model - user model to be modified
 * @returns {IUser} modified user object
 */
User.publicize = function(model) {
  model.has_password = Boolean(model.password)

  delete model.password
  delete model.secondary_password

  // Hide roles from other users. Only I can see my roles.
  const current = ObjectUtil.getCurrentUser()
  if (!current || model.id !== current) delete model.roles

  return model
}

User.patchAvatars = function(user_id, type, link, cb) {
  if (type !== 'Profile' && type !== 'Cover')
    return cb(Error.Validation('Invalid patch type'))

  return db.query('user/patch_avatars', [user_id, type, link], cb)
}

/**
 * @param {UUID} user_id
 * @param {UUID[]} users
 * @param {string[]} emails
 * @param {string[]} phone_numbers
 * @param {Callback<UUID[]>} cb
 */
User.getOrCreateBulk = function(user_id, users, emails, phone_numbers, cb) {
  async.auto(
    {
      user: cb => {
        User.get(user_id).nodeify(cb)
      },
      users: cb => {
        User.getAll(users).nodeify(cb)
      },
      emails: cb => {
        async.map(emails, (email, cb) => User.getOrCreateByEmail(email).nodeify(cb), cb)
      },
      phones: cb => {
        async.map(phone_numbers, User.getOrCreateByPhoneNumber, cb)
      },
      unique: [
        'user',
        'users',
        'emails',
        'phones',
        (cb, results) => {
          const u = users
          const e = results.emails.map(r => r.id)
          const p = results.phones.map(r => r.id)

          const r = User.combineAndUniqueUserReferences(user_id, u, e, p)

          return cb(null, r)
        }
      ]
    },
    (err, results) => {
      if (err) return cb(err)

      return cb(null, results.unique)
    }
  )
}

User.getLoginLink = async (user, client) => {
  const params = {
    uri: '/branch'
  }

  const token = await Token.create({
    client_id: client.id,
    user: user.id,
    token_type: Token.REFRESH,
    expires_at: new Date((Number(new Date)) + (5 * 1000)),
  })

  const data = {}

  data.refresh_token = token
  data.action = 'UserLogin'
  data.receiving_user = user.id

  const url = Url.web(params)
  data['$desktop_url'] = url
  data['$fallback_url'] = url

  return Branch.createURL(data)
}

/**
 * @param {UUID} user_id
 * @param {string} token
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
User.upgradeToAgentWithToken = function(user_id, token, agent_id, cb) {
  User.get(user_id).nodeify((err, user) => {
    if (err) return cb(err)

    if (user.secondary_password !== token)
      return cb(Error.Unauthorized('Invalid credentials'))

    User.upgradeToAgent(user_id, agent_id, cb)
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} agent_id
 * @param {Callback<any>} cb
 */
User.upgradeToAgent = function(user_id, agent_id, cb) {
  db.query('user/upgrade_to_agent', [user_id, agent_id], (err, user) => {
    if (err) return cb(err)

    Emitter.emit('User:upgrade', user_id)

    cb(err, user)
  })
}

User.getStatus = function(user, _cb) {
  if (SocketServer.ready) {
    const status = SocketServer.getUserStatus(user)
    return _cb(null, status)
  }

  let responded = false
  const cb = (err, result) => {
    if (responded) return

    responded = true
    _cb(err, result)
  }

  const c = Context.getActive()

  const job = queue
    .create('socket_user_status', { user })
    .removeOnComplete(true)

  job.on('complete', status => {
    c.enter()
    cb(null, status)
  })

  const fail = () => {
    cb(null, User.OFFLINE)
  }

  // eslint-disable-next-line handle-callback-err
  job.on('failed', err => {
    c.enter()
    fail()
  })

  setTimeout(fail, 100)

  job.save()
}

User.markAsSeen = function(user_id, client_id) {
  const job = queue
    .create('save_last_seen', {
      user_id,
      client_id,
      time: new Date()
    })
    .removeOnComplete(true)

  job.save()
}

User.saveLastSeen = function({ user_id, client_id, time }, cb) {
  db.query('user/seen', [user_id, client_id, time], cb)
}

User.associations = {
  agent: {
    optional: true,
    model: 'Agent'
  },

  contacts: {
    collection: true,
    optional: true,
    model: 'Contact',
    enabled: false
  },

  last_seen_by: {
    optional: true,
    model: 'Client',
    enabled: false
  }
}

module.exports = User
