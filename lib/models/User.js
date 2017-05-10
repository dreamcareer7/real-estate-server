/**
 * @namespace User
 */

require('../utils/require_asc.js')
require('../utils/require_html.js')

const EventEmitter = require('events').EventEmitter

const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const config = require('../config.js')
const crypto = require('crypto')
const async = require('async')
const bcrypt = require('bcrypt')
const uuid = require('node-uuid')
const _u = require('underscore')

const debug = require('debug')('rechat:users')
const queue = require('../utils/queue.js')

const text_password_recovery = require('../asc/user/password_recovery.asc')
const text_subject_password_recovery = require('../asc/user/subject_password_recovery.asc')
const text_password_recovery_done = require('../asc/user/password_recovery_done.asc')
const text_subject_password_recovery_done = require('../asc/user/subject_password_recovery_done.asc')

const html_body = require('../html/email.html')
const html_password_recovery = require('../html/user/password_recovery.html')
const html_password_recovery_done = require('../html/user/password_recovery_done.html')

User = new EventEmitter()

User.ONLINE = 'Online'
User.BACKGROUND = 'Background'
User.OFFLINE = 'Offline'

CompactUser = {}

Orm.register('user', 'User')
Orm.register('compact_user', 'CompactUser')

/**
 * * `Deleted`
 * * `De-Activated`
 * * `Restricted`
 * * `Banned`
 * * `Active`
 * @typedef user_status
 * @type {string}
 * @memberof User
 * @instance
 * @enum {string}
 */

/**
 * * `Client`
 * * `Agent`
 * @typedef user_type
 * @type {string}
 * @memberof User
 * @instance
 * @enum {string}
 */

/**
 * @typedef user
 * @type {object}
 * @memberof User
 * @instance
 * @property {uuid} id - ID of this `user`
 * @property {string} type - this is always *user*
 * @property {string} password - _bcrypt_ hash of current password
 * @property {string} first_name - first name
 * @property {string} last_name - last name
 * @property {string} email - email address
 * @property {User#user_type} user_type - indicates the type of this user
 * @property {User#user_status} user_status - current `user` status
 * @property {string} timezone - standard time zone string associated with this `user`
 * @property {string=} profile_image_url - URL of the profile image
 * @property {string=} cover_image_url - URL of the cover image
 * @property {string=} phone_number - phone number
 * @property {boolean=} email_confirmed - indicates whether this `user` has confirmed their email address
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

/**
 * @typedef compact_user
 * @type {object}
 * @memberof User
 * @instance
 * @property {uuid} id - ID of this `user`
 * @property {string} first_name - first name
 * @property {string} last_name - last name
 * @property {User#user_type} user_type - indicates the type of this `user`
 * @property {string=} profile_image_url - URL of the profile image
 * @property {string=} cover_image_url - URL of the cover image
 */

const schema = {
  type: 'object',
  properties: {
    password: {
      type: 'string',
      required: true
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
      type: 'string',
      format: 'email',
      required: true
    },

    phone_number: {
      type: 'string',
      phone: true,
      required: false
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    agent: {
      type: 'string',
      uuid: true,
      required: false
    },

    user_type: {
      type: 'string',
      required: false,
      enum: ['Client', 'Agent']
    },

    user_connect: {
      type: 'string',
      uuid: true,
      required: false
    },

    room_connect: {
      type: 'string',
      uuid: true,
      required: false
    },

    is_shadow: {
      type: 'boolean',
      required: false
    },

    actions: {
      type: 'array',
      minItems: 1,
      required: false
    }
  }
}

const schema_patch = {
  type: 'object',
  properties: {
    password: {
      type: 'string',
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
      type: 'string',
      format: 'email',
      required: false
    },

    phone_number: {
      type: 'string',
      phone: true,
      required: false
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent', 'Brokerage', 'Admin']
    }
  }
}

const schema_handle_action = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: [ 'favorite_listing', 'listing_inquiry', 'create_alert', 'user_connect', 'room_connect' ],
      required: true
    },

    listing: {
      type: 'string',
      uuid: true,
      required: true
    },

    agent: {
      type: 'string',
      uuid: true,
      required: true
    },

    brand: {
      type: 'string',
      uuid: true,
      required: true
    },

    source_type: {
      type: 'string',
      required: true,
      enum: [
        'BrokerageWidget',
        'IOSAddressBook',
        'SharesRoom',
        'ExplicitlyCreated'
      ]
    },

    alert: {
      type: 'object',
      required: false
    }
  }
}

const validate = validator.bind(null, schema)
const validate_patch = validator.bind(null, schema_patch)

/**
 * Inserts a `user` object into database
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `user` object created
 */
function insert (user, cb) {
  db.query('user/insert', [
    user.first_name,
    user.last_name,
    user.password,
    user.email,
    user.phone_number,
    'Client',
    user.agent,
    user.is_shadow,
    user.brand,
    user.fake_email
  ], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].id)
  })
}

/**
 * Updates a `user` object from database
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being updated
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {?}
 */
function update (user_id, user, cb) {
  db.query('user/update', [
    user.first_name,
    user.last_name,
    user.email,
    user.phone_number,
    user.profile_image_url,
    user.cover_image_url,
    user.brand,
    user.keep_shadow,
    user_id
  ], cb)
}

/**
 * Checks whether an email address address is available for registration
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 */
User.emailAvailable = function (user, cb) {
  User.getByEmail(user.email, (err, user) => {
    if (err)
      return cb(err)

    if (user) {
      return cb(Error.Conflict({
        details: {
          attributes: {
            email: 'Provided email already exists'
          },
          info: {
            is_shadow: user.is_shadow,
            id: user.id
          }
        }
      }))
    }

    return cb()
  })
}

User.phoneAvailable = function (user, cb) {
  if (!user.phone_number)
    return cb()

  User.getByPhoneNumber(user.phone_number, function (err, user) {
    if (err)
      return cb(err)

    if (user) {
      return cb(Error.Conflict(
        {
          details: {
            attributes: {
              phone_number: 'Provided phone number is already registered to another user'
            }
          }
        }
      ))
    }

    return cb()
  })
}

/**
 * Retrieves a full `User` object
 * @name get
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user}
 */
User.get = function (user_id, cb) {
  User.getAll([user_id], (err, users) => {
    if(err)
      return cb(err)

    if (users.length < 1)
      return cb(Error.ResourceNotFound('User ' + user_id + ' not found'))

    const user = users[0]

    return cb(null, user)
  })
}

User.getAll = function(ids, cb) {
  db.query('user/get', [ids, ObjectUtil.getCurrentUser()], (err, res) => {
    if(err)
      return cb(err)

    const users = res.rows.map(user => {
      user.display_name = User.getDisplayName(user)
      user.abbreviated_display_name = User.getAbbreviatedDisplayName(user)
    })

    return cb(null, users)
  })
}

User.getDisplayName = function (user) {
  if (!_u.isEmpty(user.first_name) && !_u.isEmpty(user.last_name))
    return user.first_name + ' ' + user.last_name

  if (!_u.isEmpty(user.email) && !user.fake_email)
    return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

User.getAbbreviatedDisplayName = function (user) {
  if (!_u.isEmpty(user.first_name) && !_u.isEmpty(user.last_name))
    return user.first_name

  if (!_u.isEmpty(user.email) && !user.fake_email)
    return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

User.getCompact = function (user_id, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    user.type = 'compact_user'
    return cb(null, user)
  })
}

/**
 * Retrieves a full `user` object by email
 * @name getByEmail
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user} full `user` object
 */
User.getByEmail = function (email, cb) {
  db.query('user/get_by_email', [email], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    return User.get(res.rows[0].id, cb)
  })
}

/**
 * Retrieves a full `user` object by phone number
 * @name getByPhoneNumber
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - phone number of the user being retrieved
 * @param {callback} cb - callback function
 * @returns {User#user} full `user` object
 */
User.getByPhoneNumber = function (phone, cb) {
  const p = ObjectUtil.formatPhoneNumberForDialing(phone)

  db.query('user/get_by_phone', [p], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    return User.get(res.rows[0].id, cb)
  })
}

/**
 * Creates a `user` object
 * @name create
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {User#user} ID of the created `user` object
 */
User.create = function (user, cb) {
  const brand = Brand.getCurrent()
  user.brand = brand ? brand.id : null

  const handle_user_connect = (user_id, peer_id, source_type, brand, cb) => {
    return User.connectToUser(user_id, peer_id, source_type, brand, cb)
  }

  const handle_room_connect = (user_id, room_id, cb) => {
    return User.connectToRoom(user_id, room_id, cb)
  }

  const handle_favorite_listing = (user_id, listing_id, agent_id, external_info, cb) => {
    async.auto({
      user: cb => {
        return User.get(user_id, cb)
      },
      recommendation: [
        'user',
        (cb, results) => {
          Room.recommendListing(results.user.personal_room, listing_id, external_info, cb)
        }
      ],
      favorite: [
        'recommendation',
        (cb, results) => {
          Recommendation.patch('favorite', true, user_id, results.recommendation.id, true, cb)
        }
      ]
    }, (err, res) => {
      if (err)
        return cb(err)

      return cb(null, {
        action: 'favorite_listing',
        listing: listing_id,
        agent: agent_id
      })
    })
  }

  const handle_create_alert = (user_id, alert, cb) => {
    alert.created_by = user_id

    async.auto({
      user: cb => {
        return User.get(user_id, cb)
      },
      alert: [
        'user',
        (cb, results) => {
          return Alert.create(results.user.personal_room, alert, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, {
        action: 'create_alert',
        alert: results.alert.id
      })
    })
  }

  const handle_listing_inquiry = (user_id, r, brand_id, external_info, cb) => {
    const clone = _u.clone(schema_handle_action)
    clone.properties.agent.required = false
    clone.properties.brand.required = false

    validator(clone, r, (err) => {
      if (err)
        return cb(err)

      return Listing.inquiry(
        user_id,
        r.listing,
        r.agent,
        brand_id,
        r.source_type,
        external_info,
        cb
      )
    })
  }

  async.auto({
    validate: cb => {
      return validate(user, cb)
    },
    brand: cb => {
      if (!user.brand)
        return cb()

      return Brand.get(user.brand, cb)
    },
    email_available: [
      'validate',
      cb => {
        return User.emailAvailable(user, cb)
      }
    ],
    phone_available: [
      'validate',
      cb => {
        return User.phoneAvailable(user, cb)
      }
    ],
    hash_password: [
      'email_available',
      'phone_available',
      cb => {
        User.hashPassword(user.password, cb)
      }
    ],
    insert: [
      'hash_password',
      'brand',
      (cb, results) => {
        user.password = results.hash_password
        user.phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

        return insert(user, cb)
      }
    ],
    personal_room: [
      'insert',
      (cb, results) => {
        User.createPersonalRoom(results.insert, cb)
      }
    ],
    user_connect: [
      'insert',
      'brand',
      (cb, results) => {
        return handle_user_connect(results.insert, user.user_connect, 'BrokerageWidget', results.brand ? results.brand.id : null, cb)
      }
    ],
    room_connect: [
      'insert',
      (cb, results) => {
        return handle_room_connect(results.insert, user.room_connect, cb)
      }
    ],
    get: [
      'insert',
      (cb, results) => {
        return User.get(results.insert, cb)
      }
    ],
    handle_actions: [
      'insert',
      'personal_room',
      'brand',
      'get',
      (cb, results) => {
        if (!user.actions)
          return cb()

        const opts = results

        const external_info = {
          ref_user_id: results.insert,
          source: 'MLS',
          source_url: 'https://mls.org',
          notification: 'Share'
        }

        async.map(user.actions, (r, cb) => {
          async.auto({
            listing: cb => {
              if (!r.listing)
                return cb()

              return Listing.get(r.listing, cb)
            },
            user: cb => {
              if (!r.user)
                return cb()

              return User.get(r.user, cb)
            },
            agent: cb => {
              if (!r.agent)
                return cb()

              return Agent.get(r.agent, cb)
            },
            room: cb => {
              if (!r.room)
                return cb()

              return Room.get(r.room, cb)
            },
            handle: [
              'listing',
              'user',
              'agent',
              'room',
              (cb, results) => {
                if (r.action === 'favorite_listing') {
                  return handle_favorite_listing(opts.get.id, r.listing, r.agent, external_info, cb)
                } else if (r.action === 'create_alert') {
                  return handle_create_alert(opts.get.id, r.alert, cb)
                } else if (r.action === 'listing_inquiry') {
                  return handle_listing_inquiry(opts.get.id, r, user.brand, external_info, cb)
                } else if (r.action === 'user_connect') {
                  return handle_user_connect(opts.insert, r.user, r.source_type, results.get.brand, cb)
                } else if (r.action === 'room_connect') {
                  return handle_room_connect(opts.insert, r.room, cb)
                }

                return cb()
              }
            ]
          }, (err, results) => {
            if (err)
              return cb(err)

            return cb(null, results.handle)
          })
        }, (err, results) => {
          if (err)
            return cb(err)

          const ret = results[0] || null

          return cb(null, ret)
        })
      }
    ],
    invite_activity: [
      'insert',
      'get',
      'brand',
      'handle_actions',
      (cb, results) => {
        const activity = {
          action: user.is_shadow ? 'UserInvited' : 'UserSignedUp',
          object: results.insert,
          object_class: 'user'
        }

        Activity.add(results.insert, 'User', activity, cb)
      }
    ],
    send_activation: [
      'insert',
      'get',
      'brand',
      'handle_actions',
      (cb, results) => {
        if (user.skip_confirmation)
          return cb()

        let team = false

        if (results.brand) {
          team = {}

          if (results.handle_actions) {
            for (const i in results.handle_actions)
              team[i] = results.handle_actions[i]
          }
        }

        return User.sendActivation(results.insert, team, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    User.emit('user created', results.insert)
    return cb(null, results.insert)
  })
}

/**
 * Patches a `user` object with new data
 * @name patch
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being patched
 * @param {User#user} user - full user object
 * @param {callback} cb - callback function
 * @returns {?}
 */
User.patch = function (user_id, user, cb) {
  const email_owner = cb => {
    if (!user.email)
      return cb()

    User.getByEmail(user.email, function (err, email_owner) {
      if (err)
        return cb(err)

      if (email_owner && email_owner.id !== user.id)
        return cb(Error.Conflict('Provided email is already associated with another user'))

      cb(null, email_owner)
    })
  }

  const phone_owner = cb => {
    if (!user.phone_number)
      return cb()

    user.phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

    User.getByPhoneNumber(user.phone_number, function (err, phone_owner) {
      if (err)
        return cb(err)

      if (phone_owner && phone_owner.id !== user.id)
        return cb(Error.Conflict('Provided phone number is already associated with another user'))

      cb(null, phone_owner)
    })
  }

  const email_verification = (cb, results) => {
    if (!user.email)
      return cb()

    if (results.email_owner && results.email_owner.id === user.id)
      return cb() // Email address not changed.

    EmailVerification.create({
      email: user.email
    }, true, cb)
  }

  const phone_verification = (cb, results) => {
    if (!user.phone_number)
      return cb()

    if (results.phone_owner && results.phone_owner.id === user.id)
      return cb() // Phone number has changed

    PhoneVerification.create({
      phone_number: user.phone_number
    }, true, cb)
  }

  async.auto({
    validate: cb => validate_patch(user, cb),
    email_owner: email_owner,
    phone_owner: phone_owner,
    update: ['validate', 'email_owner', 'phone_owner', cb => update(user_id, user, cb)],
    email_verification: ['update', email_verification],
    phone_verification: ['update', phone_verification]
  }, cb)
}

/**
 * Deletes a `user` object
 * @name delete
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being deleted
 * @param {callback} cb - callback function
 */
User.delete = function (user_id, cb) {
  db.query('user/delete', [user_id], cb)
}

User.connectToUser = function (user_id, peer_id, source_type, brand, cb) {
  if (!peer_id || !user_id) {
    debug('>>> (User::create::user_connect) No connect user specified')
    return cb()
  }

  const override = {
    title: 'Welcome to Rechat',
    message: 'Welcome to Rechat, you can send messages here. It\'s the fastest way to get a hold of me.',
    from: peer_id,
    connect: {
      source_type: source_type || 'BrokerageWidget',
      brand: brand || null
    }
  }

  User.get(peer_id, (err, user_connect) => {
    if (err)
      return cb(err)

    Room.bulkCreateWithUsers(user_id, [peer_id], override, (err, rooms) => {
      if (err)
        return cb(err)

      return cb(null, rooms[0])
    })
  })
}

User.connectToRoom = function (user_id, room_id, cb) {
  if (!room_id || !user_id) {
    debug('>>> (User::create::user_connect) No connect room specified')
    return cb()
  }

  Room.get(room_id, err => {
    if (err)
      return cb(err)

    debug('>>> (User::create::user_connect) Connecting this user with room', room_id)
    return Room.addUser({user_id, room_id}, cb)
  })
}

User.getOrCreateByEmail = function (email, info, cb) {
  if (!cb) {
    cb = info
    info = {}
  }

  User.getByEmail(email, (err, user) => {
    if (err)
      return cb(err)

    if (user)
      return cb(null, user)

    crypto.randomBytes(24, (err, buffer) => {
      if (err)
        return cb(err)

      const shadow_user = {
        first_name: info.first_name || email,
        last_name: info.last_name || '',
        email: email,
        password: buffer.toString('hex'),
        user_type: 'Client',
        is_shadow: true,
        skip_confirmation: true
      }

      User.create(shadow_user, (err, id) => {
        if (err)
          return cb(err)

        return User.get(id, cb)
      })
    })
  })
}

User.getOrCreateByPhoneNumber = function (phone, cb) {
  async.auto({
    get_phone: cb => {
      return User.getByPhoneNumber(phone, cb)
    },
    random: cb => {
      return crypto.randomBytes(24, cb)
    },
    create: [
      'get_phone',
      'random',
      (cb, results) => {
        const user = results.get_phone

        if (user)
          return cb(null, user)

        const shadow_user = {
          first_name: '',
          last_name: '',
          email: 'guest+' + uuid.v1().replace(/-/g, '') + '@rechat.com',
          phone_number: phone,
          password: results.random.toString('hex'),
          user_type: 'Client',
          is_shadow: true,
          skip_confirmation: true,
          fake_email: true
        }

        return User.create(shadow_user, (err, id) => {
          if (err)
            return cb(err)

          return User.get(id, cb)
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.create)
  })
}

/**
 * Sets an `Address` object for a `user`
 * @name setAddress
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {Address#address} address - full address object
 * @param {callback} cb - callback function
 */
User.setAddress = function (user_id, address, cb) {
  Address.create(address, function (err, address) {
    if (err)
      return cb(err)

    db.query('user/set_address', [address, user_id], cb)
  })
}

/**
 * Unsets an `Address` associated with a `user` object
 * @name unsetAddress
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 */
User.unsetAddress = function (user_id, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    if (!user || !user.address)
      return cb()

    Address.delete(user.address, function (err) {
      if (err)
        return cb(err)

      db.query('user/unset_address', [user_id], cb)
    })
  })
}

/**
 * Checks whether a `user` object's password has the same _bcrypt_ hash as the supplied password
 * @name verifyPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} user - full user object
 * @param {string} passowrd - password to be verified
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.verifyPassword = function (user, password, cb) {
  User.getHashedPassword(user.id, (err, hash) => {
    if (err)
      return cb(err)

    // FIXME
    // This is an open bug on node.bcrypt.js
    // https://github.com/ncb000gt/node.bcrypt.js/issues/235
    const d = process.domain
    bcrypt.compare(password, hash, (err, ok) => {
      if (d)
        d.enter()

      if (err)
        return cb(err)

      return cb(null, ok)
    })
  })
}

/**
 * Updates the _bcrypt_ hashed password for a `user` object
 * @name updatePassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} new_password - new password for the user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.updatePassword = function (user_id, new_password, cb) {
  User.hashPassword(new_password, (err, hashed) => {
    if (err)
      return cb(err)

    db.query('user/change_password', [user_id, hashed], cb)
  })
}

/**
 * Triggers the flow of password change. It checks whether `old_password`
 * matches current password of the `user`, then replaces current password with the
 * supplied `new_password` argument
 * @name changePassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} old_password - current password for the user
 * @param {string} new_password - new password for the user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.changePassword = function (user_id, old_password, new_password, cb) {
  User.verifyPassword({id: user_id}, old_password, (err, ok) => {
    if (err)
      return cb(err)

    if (!ok)
      return cb(Error.Unauthorized())

    return User.updatePassword(user_id, new_password, cb)
  })
}

/**
 * Gets the `user` hashed password
 * @name getHashedPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {string} _bcrypt_ hashed password
 */
User.getHashedPassword = function (user_id, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    db.query('user/get_hashed', [user_id], function (err, res) {
      if (err)
        return cb(err)

      return cb(null, res.rows[0].password)
    })
  })
}

/**
 * Creates a _bcrypt_ hash of the supplied password
 * @name hashPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} password - password to be hashed
 * @param {callback} cb - callback function
 * @returns {string} _bcrypt_ hashed password
 */
User.hashPassword = function (password, cb) {
  // FIXME
  // This is an open bug on node.bcrypt.js
  // https://github.com/ncb000gt/node.bcrypt.js/issues/235
  const d = process.domain
  bcrypt.hash(password, 5, (err, res) => {
    if (d)
      d.enter()

    if (err)
      return cb(err)

    return cb(null, res)
  })
}

/**
 * This method initiates a password recovery flow for a user. We create a string consisting of their email
 * and a random token and encrypt the whole thing. We then send this token as a query string link to our own
 * password recovery app using email. When the user clicks on the link, they get redirected to our password
 * recovery app which asks them about a new password. This is a fairly straightforward and common process.
 * @name initiatePasswordReset
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.initiatePasswordReset = function (email, cb) {
  User.getByEmail(email, function (err, user) {
    if (err)
      return cb(err)

    if (!user)
      return cb(Error.ResourceNotFound('User not found'))

    const token = crypto.randomBytes(20).toString('hex')

    db.query('user/record_pw_recovery', [email, user.id, token], function (err, res) {
      if (err)
        return cb(err)

      const pw_token_plain = JSON.stringify({
        email: email,
        token: token
      })

      const pw_token = Crypto.encrypt(pw_token_plain)

      const url = Url.web({
        uri: '/reset_password',
        query: {
          token: pw_token
        }
      })

      Email.send({
        from: config.email.from,
        to: [ user.email ],
        source: config.email.source,
        html_body: html_body,
        message: {
          body: {
            text: {
              data: text_password_recovery
            },
            html: {
              data: html_password_recovery
            }
          },
          subject: {
            data: text_subject_password_recovery
          }
        },
        template_params: {
          first_name: user.first_name,
          password_recovery_url: url,
          _title: 'Password Recovery'
        }
      }, cb)
    })
  })
}

/**
 * This is almost always called by our password recovery app. It checks whether we have a record for password
 * recovery request for a certain user and checks that against the provided token. If all goes well, password
 * for the requesting user is changed.
 * @name resetPassword
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {string} email - email of the referenced user
 * @param {string} token - token deciphered from the encrypted link in the email
 * @param {string} password - new password
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.resetPassword = function (email, token, password, cb) {
  User.getByEmail(email, function (err, user) {
    if (err)
      return cb(err)

    if (!user)
      return cb(Error.ResourceNotFound('User not found'))

    db.query('user/check_pw_reset_token', [email, token], function (err, res) {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(Error.Forbidden())

      User.updatePassword(user.id, password, function (err, ok) {
        if (err)
          return cb(err)

        Email.send({
          from: config.email.from,
          to: [ user.email ],
          source: config.email.source,
          html_body: html_body,
          message: {
            body: {
              text: {
                data: text_password_recovery_done
              },
              html: {
                data: html_password_recovery_done
              }
            },
            subject: {
              data: text_subject_password_recovery_done
            }
          },
          template_params: {
            first_name: user.first_name,
            email: user.email,
            _title: 'Password Recovery'
          }
        }, function (err, status) {
          if (err)
            return cb(err)

          db.query('user/remove_pw_reset_token', [email, token], cb)
        })
      })
    })
  })
}

User.resetPasswordByShadowToken = function (email, phone_number, token, password, cb) {
  async.auto({
    user: cb => {
      if (email) {
        User.getByEmail(email, (err, user) => {
          if(err)
            return cb(err)

          if (!user)
            return cb(Error.ResourceNotFound('User not found'))

          return cb(null, user)
        })
      } else if (phone_number) {
        User.getByPhoneNumber(phone_number, (err, user) => {
          if(err)
            return cb(err)

          if(!user)
            return cb(Error.ResourceNotFound('User not found'))

          return cb(null, user)
        })
      } else {
        return cb(Error.NotAcceptable('Either a phone number or an email is required to make a password reset'))
      }
    },
    check: [
      'user',
      cb => {
        if (email) {
          db.query('user/check_shadow_token_email', [email, token], (err, res) => {
            if (err)
              return cb(err)

            else if (res.rows.length < 1)
              return cb(Error.Forbidden('Invalid credentials'))

            return cb()
          })
        } else if (phone_number) {
          db.query('user/check_shadow_token_phone', [phone_number, token], (err, res) => {
            if(err)
              return cb(err)

            else if (res.rows.length < 1)
              return cb(Error.Forbidden('Invalid credentials'))

            return cb()
          })
        } else {
          return cb(Error.NotAcceptable('Either an email or a phone number is required to make a password reset'))
        }
      }
    ],
    update_password: [
      'user',
      'check',
      (cb, results) => {
        return User.updatePassword(results.user.id, password, cb)
      }
    ],
    confirm: [
      'user',
      'check',
      'update_password',
      (cb, results) => {
        if (email) {
          return User.confirmEmail(results.user.id, cb)
        } else if (phone_number) {
          return User.confirmPhone(results.user.id, cb)
        }

        return cb(Error.NotAcceptable('Either an email or a phone number is required to make a password reset'))
      }
    ],
    signup_activity: [
      'user',
      'check',
      'update_password',
      (cb, results) => {
        if(!results.user.is_shadow)
          return cb()

        const activity = {
          action: 'UserSignedUp',
          object: results.user.id,
          object_class: 'user'
        }

        Activity.add(results.user.id, 'User', activity, cb)
      }
    ]
  }, cb)
}

User.confirmEmail = function (id, cb) {
  db.query('user/confirm_email', [id], (err, res) => {
    if (err)
      return cb(err)

    return cb()
  })
}

User.confirmPhone = function (id, cb) {
  db.query('user/confirm_phone', [id], (err, res) => {
    if(err)
      return cb(err)

    return cb()
  })
}

/**
 * Updates a time zone information for a user
 * @name patchTimeZone
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {string} timezone - new time zone string representation
 * @param {callback} cb - callback function
 * @returns {uuid[]}
 */
User.patchTimeZone = function (user_id, timezone, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    db.query('user/patch_timezone', [user_id, timezone], function (err, res) {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

User.patchFacebookAccessToken = function (user_id, token, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    Facebook.getAccessToken(token, (err, long_lived) => {
      if (err)
        return cb(err)

      db.query('user/patch_facebook_access_token', [user_id, long_lived], function (err, res) {
        if (err)
          return cb(err)

        return cb()
      })
    })
  })
}

/**
 * We have the policy of disabling push notification between 9:30 PM
 * and 8:30 AM. This should later turn into something more configurable.
 * @name isPushOK
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
User.isPushOK = function (user_id, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    db.query('user/ok_push', [user_id], function (err, res) {
      if (err)
        return cb(err)

      return cb(null, res.rows[0].remaining)
    })
  })
}

User.stringSearch = function (terms, limit, cb) {
  terms = terms.map(r => {
    return '%' + r + '%'
  })

  db.query('user/string_search', [terms, limit], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const user_ids = res.rows.map(function (r) {
      return r.id
    })

    async.map(user_ids, User.get, function (err, users) {
      if (err)
        return cb(err)

      users[0].total = res.rows[0].total
      return cb(null, users)
    })
  })
}

User.stringSearchFuzzy = function (terms, limit, similarity, cb) {
  terms = terms.join('|')

  db.query('user/string_search_fuzzy', [terms, limit, similarity], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const user_ids = res.rows.map(function (r) {
      return r.id
    })

    async.map(user_ids, User.get, function (err, users) {
      if (err)
        return cb(err)

      users[0].total = res.rows[0].total
      return cb(null, users)
    })
  })
}

/**
 * Stripping the `User` object off of it's sensitive contents for public consumption
 * like password, email, etc.
 * @name publicize
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} model - user model to be modified
 * @returns {User#user} modified user object
 */
User.publicize = function (model) {
  if (!model.address)
    model.address = null

  delete model.password
  delete model.secondary_password
  delete model.address_id
  delete model.facebook_access_token

  return model
}

User.patchAvatars = function (user_id, type, link, cb) {
  if (type !== 'Profile' && type !== 'Cover')
    return cb(Error.Validation('Invalid patch type'))

  return db.query('user/patch_avatars', [user_id, type, link], cb)
}

User.classifyPhoneNumbers = function (phones, cb) {
  const existing = []
  const existing_ids = []
  const non_existing = []

  async.map(phones, (r, cb) => {
    const n = ObjectUtil.formatPhoneNumberForDialing(r)
    User.getByPhoneNumber(n, (err, user) => {
      if (err)
        return cb(err)

      if (!user) {
        non_existing.push(n)
        return cb()
      }

      existing.push(n)
      existing_ids.push(user.id)
      return cb()
    })
  }, (err, results) => {
    if (err)
      return cb(err)

    const ret = {
      non_existing: non_existing,
      existing: {
        ids: existing_ids,
        phones: existing
      }
    }

    return cb(null, ret)
  })
}

User.getFormattedForLogs = function (user) {
  return (user.first_name + ' ' + user.last_name +
          ' <' + user.email + '>'.black.cyanBG + ' ' + ('(' + user.id.blue + ')').blue)
}

User.combineAndUniqueUserReferences = function (user_id, users, emails, phone_numbers) {
  const e = users || []
  const se = emails || []
  const sp = phone_numbers || []

  let combine = e.concat(se).concat(sp).filter(Boolean)
  combine = _u.unique(combine)
  combine = _u.without(combine, user_id)

  return combine
}

User.combineUserReferences = function (user_id, users, emails, phones, cb) {
  let non_existing = false

  async.auto({
    users: cb => {
      if (!users)
        return cb(null, [])

      async.map(users, User.get, (err, results) => {
        if (err)
          return cb(err)

        return cb(null, results.filter(Boolean))
      })
    },
    emails: cb => {
      if (!emails)
        return cb(null, [])

      async.map(emails, User.getByEmail, (err, results) => {
        if (err)
          return cb(err)

        const s = results.filter(Boolean)
        if (emails.length !== s.length)
          non_existing = true

        return cb(null, s)
      })
    },
    phones: cb => {
      if (!phones)
        return cb(null, [])

      async.map(phones, (r, cb) => {
        return User.getByPhoneNumber(r, cb)
      }, (err, results) => {
        if (err)
          return cb(err)

        const s = results.filter(Boolean)
        if (phones.length !== s.length)
          non_existing = true

        return cb(null, s)
      })
    },
    check: [
      'users',
      'emails',
      'phones',
      (cb, results) => {
        const u = users ? users : []

        const e = results.emails.map(r => {
          return r.id
        })

        const p = results.phones.map(r => {
          return r.id
        })

        const r = User.combineAndUniqueUserReferences(user_id, u, e, p)

        return cb(null, {
          users: r,
          non_existing: non_existing
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.check)
  })
}

User.getOrCreateBulk = function(user_id, users, emails, phone_numbers, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    users: cb => {
      async.map(users, User.get, cb)
    },
    emails: cb => {
      async.map(emails, User.getOrCreateByEmail, cb)
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
        const e = results.emails.map(r => {
          return r.id
        })
        const p = results.phones.map(r => {
          return r.id
        })

        const r = User.combineAndUniqueUserReferences(user_id, u, e, p)

        return cb(null, r)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.unique)
  })
}

User.sendActivation = function (user_id, context, cb) {
  const contacting_agent = cb => {
    if (context.agent)
      return Agent.get(context.agent, cb)

    const brand = Brand.getCurrent()

    if (!brand)
      return cb()

    Brand.proposeContactingUser(brand.id, cb)
  }

  const createUrl = (cb, results) => {
    const params = {
      uri: '/activate',
      query: {
        token: Crypto.encrypt(JSON.stringify({
          email: results.user.email,
          token: results.user.secondary_password
        }))
      }
    }

    if (!results.contacting_agent) {
      const url = Url.web(params)

      const data = {}

      const u = results.user
      const type = User.getLogicalType(u)
      if (type === 'RegisteredUser' || type === 'EmailShadowUser')
        data.email = u.email

      if (type === 'PhoneShadowUser')
        data.phone_number = u.phone_number

      data.receiving_user = u.id
      data.token = results.user.secondary_password
      data.action = 'UserActivation'
      data.agent = results.agent
      data['$desktop_url'] = url
      data['$fallback_url'] = url

      Branch.createURL(data, cb)
      return
    }

    if (context) {
      if (context.action === 'create_alert') {
        if (!context.alert)
          return cb(Error.Validation('You must supply alert id for proper redirection'))

        params.query.action = 'create_alert'
        params.query.alert_id = context.alert
      } else if (context.action === 'listing_inquiry') {
        if (!context.room)
          return cb(Error.Validation('You must supply room id for proper redirection'))

        params.query.action = 'listing_inquiry'
        params.query.room_id = context.room
      } else if (context.action === 'favorite_listing') {
        if (!context.listing)
          return cb(Error.Validation('You must supply listing id for proper redirection'))

        params.query.action = 'favorite_listing'
        params.query.listing_id = context.listing
      }
    }

    const url = Url.web(params)
    cb(null, url)
  }

  const renderHTML = (cb, results) => {
    let template = __dirname + '/../html/user/'
    template += (results.contacting_agent) ? 'activation_brand' : 'activation'
    template += '.html'

    if (!results.contacting_agent) {
      results.base_url = Url.web({})
      results.title = 'Activation'
    }

    Template.render(template, results, cb)
  }

  const sendEmail = (cb, results) => {
    if (!User.shouldTryEmail(results.user))
      return cb()

    Email.sane({
      from: config.email.from,
      to: [ results.user.email ],
      html: results.html,
      subject: '[Rechat] Account Activation'
    }, cb)
  }

  const renderText = (cb, results) => {
    const template = __dirname + '/../asc/user/activation.asc'
    Template.render(template, results, cb)
  }

  const sendSMS = (cb, results) => {
    if (!User.shouldTrySMS(results.user))
      return cb()

    return SMS.send({
      from: config.twilio.from,
      to: results.user.phone_number,
      body: results.text
    }, cb)
  }

  const getBrand = cb => {
    cb(null, Brand.getCurrent())
  }

  async.auto({
    user: cb => User.get(user_id, cb),
    agent: ['user', (cb, results) => Agent.matchByEmail(results.user.email, cb)],
    contacting_agent: contacting_agent,
    brand: getBrand,
    url: ['user', 'contacting_agent', 'agent', createUrl],
    html: ['url', renderHTML],
    send_email: ['html', sendEmail],
    text: ['url', renderText],
    send_sms: ['url','contacting_agent', sendSMS]
  }, cb)
}

User.upgradeToAgentWithToken = function (user_id, token, agent_id, cb) {
  User.get(user_id, (err, user) => {
    if (err)
      return cb(err)

    if (user.secondary_password !== token)
      return cb(Error.Unauthorized('Invalid credentials'))

    User.upgradeToAgent(user_id, agent_id, cb)
  })
}

User.upgradeToAgent = function (user_id, agent_id, cb) {
  db.query('user/upgrade_to_agent', [user_id, agent_id], cb)
}

User.createPersonalRoom = function (user_id, cb) {
  const copy = {
    room_type: 'Personal',
    owner: user_id
  }

  Room.create(copy, (err, room) => {
    if (err)
      return cb(err)

    db.query('user/update_personal_room', [user_id, room.id], (err, res) => {
      if (err)
        return cb(err)

      return cb(null, room)
    })
  })
}

User.getOrCreateDirectRoom = function (user_id, peer_id, cb) {
  async.auto({
    user: cb => {
      return User.get(user_id, cb)
    },
    peer: cb => {
      return User.get(peer_id, cb)
    },
    search: [
      'user',
      'peer',
      cb => {
        db.query('user/find_direct', [user_id, peer_id], (err, res) => {
          if(err)
            return cb(err)

          if (res.rows.length < 1)
            return cb()

          return cb(null, res.rows[0].id)
        })
      }
    ],
    create: [
      'search',
      (cb, results) => {
        if (results.search) {
          debug('Found a previously existing direct room with id:', results.search, 'between users:', user_id, '<->', peer_id)
          return Room.get(results.search, cb)
        }

        debug('Creating a new direct room between users:', user_id, '<->', peer_id)
        return Room.createDirect(user_id, peer_id, (err, id) => {
          if (err)
            return cb(err)

          return Room.get(id, cb)
        })
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.create)
  })
}

User.getStatus = function (user_id, cb) {
  if (typeof SocketServer !== 'undefined')
    return SocketServer.getUserStatus(user_id, cb)

  const domain = process.domain

  const job = queue.create('socket_user_status', {user_id}).ttl(100).removeOnComplete(true)

  job.on('complete', status => {
    domain.enter()
    cb(null, status)
  })
  // eslint-disable-next-line handle-callback-err
  job.on('failed', err => {
    domain.enter()
    cb(null, User.OFFLINE)
  })

  job.save()
}

User.shouldTryEmail = function (user) {
  // We don't have an email for this user
  if (!user.email)
    return false

  // Don't try sending an actual email to a fake email address
  if (user.fake_email)
    return false

  return true
}

User.shouldTrySMS = function (user) {
  // Dont send SMS. We're going to send an email.
  if (user.email && !user.fake_email)
    return false

  // Dont try sending an SMS. We dont have his number.
  if (!user.phone_number)
    return false

  return true
}

User.getLogicalType = function(user) {
  if(user.email && !user.is_shadow && !user.fake_email)
    return 'RegisteredUser'
  else if(user.email && user.is_shadow && !user.fake_email)
    return 'EmailShadowUser'
  else if(user.phone_number && user.is_shadow && user.fake_email)
    return 'PhoneShadowUser'

  return 'Unknown'
}

User.markAsSeen = function(user_id, client_id) {
  const job = queue.create('save_last_seen', {
    user_id,
    client_id,
    time: new Date
  }).removeOnComplete(true)

  job.save()
}

User.saveLastSeen = function({user_id, client_id, time}, cb) {
  db.query('user/last_seen', [user_id, client_id, time], cb)
}

/**
 * CompactUser is a minified subset of the `User` object. It contains
 * enough information to make the /agents page work.
 * @name publicize
 * @function
 * @memberof User
 * @instance
 * @public
 * @param {User#user} model - user model to be modified
 * @returns {User#compact_user} modified compact_user object
 */
CompactUser.publicize = function (model) {
  const attrs = [
    'id',
    'first_name',
    'last_name',
    'profile_image_url',
    'created_at',
    'updated_at',
    'type'
  ]

  for (const i in model)
    if (attrs.indexOf(i) < 0)
      delete model[i]

  return model
}

CompactUser.get = function (id, cb) {
  User.get(id, (err, u) => {
    if (err)
      return cb(err)

    u.type = 'compact_user'

    return cb(null, u)
  })
}

User.associations = {
  address: {
    optional: true,
    model: 'Address'
  },

  agent: {
    optional: true,
    model: 'Agent'
  },

  contacts: {
    collection: true,
    optional: true,
    model: 'Contact',
    enabled: false
  }
}

module.exports = function () {}
