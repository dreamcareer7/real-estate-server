/**
 * @namespace User
 */

require('../../utils/require_asc.js')
require('../../utils/require_html.js')

const Orm = require('../Orm')
const ObjectUtil = require('../ObjectUtil')
const Branch = require('../Branch')
const Context = require('../Context')
const Agent = require('../Agent')
const Url = require('../Url')

const EventEmitter = require('events').EventEmitter

const promisify = require('../../utils/promisify')
const validator = require('../../utils/validator.js')
const render = require('../../utils/render').html
const db = require('../../utils/db.js')
const config = require('../../config.js')
const crypto = require('crypto')
const async = require('async')
const bcrypt = require('bcrypt')
const uuid = require('node-uuid')
const _u = require('underscore')

const debug = require('debug')('rechat:users')
const queue = require('../../utils/queue.js')

const emitter = new EventEmitter()

const User = {}
global['User'] = User

User.ONLINE = 'Online'
User.BACKGROUND = 'Background'
User.OFFLINE = 'Offline'

User.on = emitter.on.bind(emitter)

Orm.register('user', 'User', User)

require('./role')

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
    },

    email_signature: {
      type: 'string',
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

const schema_handle_action = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: [
        'favorite_listing',
        'listing_inquiry',
        'create_alert',
        'user_connect',
        'room_connect'
      ],
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
 * @param {IUserInput} user - full user object
 */
async function insert(user) {
  return db.selectId(
    'user/insert',
    [
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
    ]
  )
}

/**
 * Updates a `user` object from database
 * @param {UUID} user_id - ID of the user being updated
 * @param {IUserInput} user - full user object
 * @param {Callback<any>} cb - callback function
 */
function update(user_id, user, cb) {
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
      user_id
    ],
    cb
  )
}

/**
 * Checks whether an email address address is available for registration
 * @param {{email: string}} arg1 - full user object
 */
User.emailAvailable = async function({ email }) {
  const user = await User.getByEmail(email)

  if (user) {
    throw Error.Conflict({
      details: {
        attributes: {
          email: 'Provided email already exists'
        },
        info: {
          is_shadow: user.is_shadow,
          id: user.id
        }
      }
    })
  }
}

/**
 * Checks whether a phone number is available for registration
 * @param {{phone_number?: string}} user - full user object
 */
User.phoneAvailable = async function({ phone_number }) {
  if (!phone_number) return

  const user = await User.getByPhoneNumber(phone_number)

  if (user) {
    throw Error.Conflict({
      details: {
        attributes: {
          phone_number:
            'Provided phone number is already registered to another user'
        }
      }
    })
  }
}

/**
 * Retrieves a full `User` object
 * @param {UUID} user_id - ID of the user being retrieved
 * @returns {Promise<IUser>}
 */
User.get = async function(user_id) {
  const users = await User.getAll([user_id])

  if (users.length < 1)
    throw Error.ResourceNotFound(`User ${user_id} not found`)

  return users[0]
}

/**
 * Retrieves full `User` objects
 * @param {UUID[]} ids - IDs of users being retrieved
 * @returns {Promise<IUser[]>}
 */
User.getAll = async function(ids) {
  return db.map('user/get', [ids], user => {
    user.display_name = User.getDisplayName(user)
    user.abbreviated_display_name = User.getAbbreviatedDisplayName(user)

    if (typeof SocketServer === 'undefined') user.online_state = User.OFFLINE
    else user.online_state = SocketServer.getUserStatus(user)

    return user
  })
}

User.getDisplayName = function(user) {
  if (!_u.isEmpty(user.first_name) && !_u.isEmpty(user.last_name))
    return user.first_name + ' ' + user.last_name

  if (!_u.isEmpty(user.email) && !user.fake_email) return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

User.getAbbreviatedDisplayName = function(user) {
  if (!_u.isEmpty(user.first_name) && !_u.isEmpty(user.last_name))
    return user.first_name

  if (!_u.isEmpty(user.email) && !user.fake_email) return user.email

  if (!_u.isEmpty(user.phone_number) && user.fake_email)
    return user.phone_number

  return 'Guest'
}

/**
 * Retrieves a full `user` object by email
 * @param {string} email - email of the user being retrieved
 * @returns {Promise<IUser | undefined>} full `user` object
 */
User.getByEmail = async function(email) {
  const ids = await db.selectIds('user/get_by_email', [email])

  if (ids.length < 1) return undefined

  return User.get(ids[0])
}

/**
 * Retrieves a full `user` object by phone number
 * @param {string} phone - phone number of the user being retrieved
 */
User.getByPhoneNumber = async function(phone) {
  const rows = await db.select('user/get_by_phone', [
    ObjectUtil.formatPhoneNumberForDialing(phone)
  ])

  if (rows.length < 1) return

  return User.get(rows[0].id)
}

/**
 * Creates a `user` object
 * @param {IUserInput} user - full user object
 * @param {Callback<UUID>} cb - callback function
 */
User.create = function(user, cb) {
  /** @type {IBrand} */
  const brand = Brand.getCurrent()
  user.brand = brand ? brand.id : null

  /**
   * @param {UUID} user_id 
   * @param {UUID} peer_id 
   * @param {*} source_type 
   * @param {UUID} brand 
   * @param {Callback<any>} cb 
   */
  const handle_user_connect = (user_id, peer_id, source_type, brand, cb) => {
    return User.connectToUser(user_id, peer_id, source_type, brand, cb)
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID} room_id 
   * @param {Callback<any>} cb 
   */
  const handle_room_connect = (user_id, room_id, cb) => {
    return User.connectToRoom(user_id, room_id, cb)
  }

  /**
   * 
   * @param {UUID} user_id 
   * @param {UUID} listing_id 
   * @param {UUID} agent_id 
   * @param {any} external_info 
   * @param {Callback<any>} cb 
   */
  const handle_favorite_listing = (
    user_id,
    listing_id,
    agent_id,
    external_info,
    cb
  ) => {
    async.auto(
      {
        user: cb => {
          return User.get(user_id).nodeify(cb)
        },
        recommendation: [
          'user',
          (cb, results) => {
            Room.recommendListing(
              results.user.personal_room,
              listing_id,
              external_info,
              cb
            )
          }
        ],
        favorite: [
          'recommendation',
          (cb, results) => {
            Recommendation.patch(
              'favorite',
              true,
              user_id,
              results.recommendation.id,
              true,
              cb
            )
          }
        ]
      },
      (err, res) => {
        if (err) return cb(err)

        return cb(null, {
          action: 'favorite_listing',
          listing: listing_id,
          agent: agent_id
        })
      }
    )
  }

  /**
   * @param {UUID} user_id 
   * @param {*} alert 
   * @param {Callback<any>} cb 
   */
  const handle_create_alert = (user_id, alert, cb) => {
    alert.created_by = user_id

    async.auto(
      {
        user: cb => {
          return User.get(user_id).nodeify(cb)
        },
        alert: [
          'user',
          (cb, results) => {
            return Alert.create(results.user.personal_room, alert, cb)
          }
        ]
      },
      (err, results) => {
        if (err) return cb(err)

        return cb(null, {
          action: 'create_alert',
          alert: results.alert.id
        })
      }
    )
  }

  /**
   * @param {UUID} user_id 
   * @param {*} r 
   * @param {UUID} brand_id 
   * @param {*} external_info 
   * @param {Callback<any>} cb 
   */
  const handle_listing_inquiry = (user_id, r, brand_id, external_info, cb) => {
    const clone = _u.clone(schema_handle_action)
    clone.properties.agent.required = false
    clone.properties.brand.required = false

    validator(clone, r, err => {
      if (err) return cb(err)

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

  async.auto(
    {
      validate: cb => {
        return validate(user, cb)
      },
      brand: cb => {
        if (!user.brand) return cb()

        Brand.get(user.brand).nodeify(cb)
      },
      email_available: [
        'validate',
        cb => {
          User.emailAvailable(user).nodeify(cb)
        }
      ],
      phone_available: [
        'validate',
        cb => {
          User.phoneAvailable(user).nodeify(cb)
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
          user.phone_number = ObjectUtil.formatPhoneNumberForDialing(
            user.phone_number
          )

          return insert(user).nodeify(cb)
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
          return handle_user_connect(
            results.insert,
            user.user_connect,
            'BrokerageWidget',
            results.brand ? results.brand.id : null,
            cb
          )
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
          return User.get(results.insert).nodeify(cb)
        }
      ],
      handle_actions: [
        'insert',
        'personal_room',
        'brand',
        'get',
        (cb, results) => {
          if (!user.actions) return cb()

          const opts = results

          const external_info = {
            ref_user_id: results.insert,
            source: 'MLS',
            source_url: 'https://mls.org',
            notification: 'Share'
          }

          async.map(
            user.actions,
            (r, cb) => {
              async.auto(
                {
                  listing: cb => {
                    if (!r.listing) return cb()

                    return Listing.get(r.listing, cb)
                  },
                  user: cb => {
                    if (!r.user) return cb()

                    return User.get(r.user).nodeify(cb)
                  },
                  agent: cb => {
                    if (!r.agent) return cb()

                    return Agent.get(r.agent).nodeify(cb)
                  },
                  room: cb => {
                    if (!r.room) return cb()

                    return Room.get(r.room, cb)
                  },
                  handle: [
                    'listing',
                    'user',
                    'agent',
                    'room',
                    (cb, results) => {
                      if (r.action === 'favorite_listing') {
                        return handle_favorite_listing(
                          opts.get.id,
                          r.listing,
                          r.agent,
                          external_info,
                          cb
                        )
                      } else if (r.action === 'create_alert') {
                        return handle_create_alert(opts.get.id, r.alert, cb)
                      } else if (r.action === 'listing_inquiry') {
                        return handle_listing_inquiry(
                          opts.get.id,
                          r,
                          user.brand,
                          external_info,
                          cb
                        )
                      } else if (r.action === 'user_connect') {
                        return handle_user_connect(
                          opts.insert,
                          r.user,
                          r.source_type,
                          results.get.brand,
                          cb
                        )
                      } else if (r.action === 'room_connect') {
                        return handle_room_connect(opts.insert, r.room, cb)
                      }

                      return cb()
                    }
                  ]
                },
                (err, results) => {
                  if (err) return cb(err)

                  return cb(null, results.handle)
                }
              )
            },
            (err, results) => {
              if (err) return cb(err)

              const ret = results[0] || null

              return cb(null, ret)
            }
          )
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
          if (user.skip_confirmation) return cb()

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
    },
    (err, results) => {
      if (err) return cb(err)

      emitter.emit('user created', results.insert)
      return cb(null, results.insert)
    }
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
 * @param {UUID} user_id
 * @param {UUID} peer_id
 * @param {any} source_type
 * @param {UUID} brand
 * @param {Callback<any>} cb - callback function
 */
User.connectToUser = function(user_id, peer_id, source_type, brand, cb) {
  if (!peer_id || !user_id) {
    Context.log('>>> (User::create::user_connect) No connect user specified')
    return cb()
  }

  const override = {
    title: 'Welcome to Rechat',
    message:
      'Welcome to Rechat, you can send messages here. It\'s the fastest way to get a hold of me.',
    from: peer_id,
    connect: {
      source_type: source_type || 'BrokerageWidget',
      brand: brand || null
    }
  }

  User.get(peer_id).nodeify(err => {
    if (err) return cb(err)

    Room.bulkCreateWithUsers(user_id, [peer_id], override, (err, rooms) => {
      if (err) return cb(err)

      return cb(null, rooms[0])
    })
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} room_id
 * @param {Callback<any>} cb
 */
User.connectToRoom = function(user_id, room_id, cb) {
  if (!room_id || !user_id) {
    debug('>>> (User::create::user_connect) No connect room specified')
    return cb()
  }

  Room.get(room_id, err => {
    if (err) return cb(err)

    Context.log(
      '>>> (User::create::user_connect) Connecting this user with room',
      room_id
    )
    return Room.addUser({ user_id, room_id }, cb)
  })
}

/**
 * @param {string} email
 * @param {{ first_name?: any; last_name?: any; }} info
 */
User.getOrCreateByEmail = async function(email, info = {}) {
  const user = await User.getByEmail(email)

  if (user) return user

  const buffer = crypto.randomBytes(24)

  const shadow_user = {
    first_name: info.first_name || email,
    last_name: info.last_name || '',
    email: email,
    password: buffer.toString('hex'),
    user_type: 'Client',
    is_shadow: true,
    skip_confirmation: true
  }

  const id = await promisify(User.create)(shadow_user)
  
  return User.get(id)
}

User.getOrCreateByPhoneNumber = function(phone, cb) {
  async.auto(
    {
      get_phone: cb => {
        return User.getByPhoneNumber(phone).nodeify(cb)
      },
      random: cb => {
        return crypto.randomBytes(24, cb)
      },
      create: [
        'get_phone',
        'random',
        (cb, results) => {
          const user = results.get_phone

          if (user) return cb(null, user)

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
            if (err) return cb(err)

            return User.get(id).nodeify(cb)
          })
        }
      ]
    },
    (err, results) => {
      if (err) return cb(err)

      return cb(null, results.create)
    }
  )
}

/**
 * Checks whether a `user` object's password has the same _bcrypt_ hash as the supplied password
 * @param {{password: string}} user - full user object
 * @param {string} password - password to be verified
 * @param {Callback<boolean>} cb - callback function
 */
User.verifyPassword = function(user, password, cb) {
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
User.updatePassword = function({ id, password }, cb) {
  User.hashPassword(password, (err, hashed) => {
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
User.changePassword = function(user_id, old_password, new_password, cb) {
  User.get(user_id).nodeify((err, user) => {
    if (err) return cb(err)

    User.verifyPassword(user, old_password, (err, ok) => {
      if (err) return cb(err)

      if (!ok) return cb(Error.Forbidden('Invalid credentials'))

      return User.updatePassword(
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
User.hashPassword = function(password, cb) {
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
User.initiatePasswordReset = function(email, cb) {
  User.getByEmail(email).nodeify((err, user) => {
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
        const template = __dirname + '/../../html/user/password_recovery.html'
        render(template, results, cb)
      }

      const sendEmail = (cb, results) => {
        if (!User.shouldTryEmail(results.user)) return cb()

        Email.create({
          from: config.email.from,
          to: [results.user.email],
          html: results.html,
          subject: 'Password Recovery'
        }).nodeify(cb)
      }

      async.auto(
        {
          user: cb => User.get(user.id).nodeify(cb),
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
User.resetPassword = function(email, token, password, cb) {
  async.auto(
    {
      get: (cb, results) => {
        User.getByEmail(email).nodeify((err, user) => {
          if (err) return cb(err)

          if (!user) return cb(Error.ResourceNotFound('User not found'))

          return cb(null, user)
        })
      },
      check: [
        'get',
        (cb, results) => {
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
          User.updatePassword(
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
            __dirname + '/../../html/user/password_recovery_done.html'
          render(template, results, cb)
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
User.resetPasswordByShadowToken = function(
  { email, phone_number, token, password },
  cb
) {
  async.auto(
    {
      user: cb => {
        if (email) {
          User.getByEmail(email).nodeify((err, user) => {
            if (err) return cb(err)

            if (!user) return cb(Error.ResourceNotFound('User not found'))

            return cb(null, user)
          })
        } else if (phone_number) {
          User.getByPhoneNumber(phone_number).nodeify((err, user) => {
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
          return User.updatePassword(
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
            return User.confirmEmail(results.user.id, cb)
          } else if (phone_number) {
            return User.confirmPhone(results.user.id, cb)
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

/**
 * @param {UUID} id
 * @param {Callback<void>} cb
 */
User.confirmEmail = function(id, cb) {
  db.query('user/confirm_email', [id], (err, res) => {
    if (err) return cb(err)

    return cb()
  })
}

/**
 * @param {UUID} id
 * @param {Callback<void>} cb
 */
User.confirmPhone = function(id, cb) {
  db.query('user/confirm_phone', [id], (err, res) => {
    if (err) return cb(err)

    return cb()
  })
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

User.getFormattedForLogs = function(user) {
  return (
    user.first_name +
    ' ' +
    user.last_name +
    ' <' +
    user.email +
    '>'.black.cyanBG +
    ' ' +
    ('(' + user.id.blue + ')').blue
  )
}

/**
 * @returns {UUID[]}
 */
User.combineAndUniqueUserReferences = function(
  user_id,
  users,
  emails,
  phone_numbers
) {
  const e = users || []
  const se = emails || []
  const sp = phone_numbers || []

  let combine = e
    .concat(se)
    .concat(sp)
    .filter(Boolean)
  combine = _u.uniq(combine)

  return combine
}

User.combineUserReferences = function(user_id, users, emails, phones, cb) {
  let non_existing = false

  async.auto(
    {
      users: cb => {
        if (!users) return cb(null, [])

        User.getAll(users).nodeify((err, results) => {
          if (err) return cb(err)

          return cb(null, results.filter(Boolean))
        })
      },
      emails: cb => {
        if (!emails) return cb(null, [])

        async.map(
          emails,
          (e, cb) => User.getByEmail(e).nodeify(cb),
          (err, results) => {
            if (err) return cb(err)

            const s = results.filter(Boolean)
            if (emails.length !== s.length) non_existing = true

            return cb(null, s)
          }
        )
      },
      phones: cb => {
        if (!phones) return cb(null, [])

        async.map(
          phones,
          (r, cb) => {
            return User.getByPhoneNumber(r).nodeify(cb)
          },
          (err, results) => {
            if (err) return cb(err)

            const s = results.filter(Boolean)
            if (phones.length !== s.length) non_existing = true

            return cb(null, s)
          }
        )
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
    },
    (err, results) => {
      if (err) return cb(err)

      return cb(null, results.check)
    }
  )
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

/**
 * @param {UUID} user_id
 * @param {IUserActivationContext} context
 */
User.sendActivation = function(user_id, context, cb) {
  async function contacting_agent() {
    if (context.agent) return Agent.get(context.agent)

    const brand = Brand.getCurrent()

    if (!brand) return

    const agents = await Brand.proposeAgents(brand.id, user_id)
    if (agents.length < 1) return

    return Agent.get(agents[0].agent)
  }

  /**
   * @param {Callback<string>} cb 
   * @param {{user: IUser, agent: IAgent}} results 
   */
  const createUrl = (cb, results) => {
    const params = {
      uri: '/branch'
    }

    if (context && context.action) {
      params.query = {
        token: Crypto.encrypt(
          JSON.stringify({
            email: results.user.email,
            token: results.user.secondary_password
          })
        )
      }

      if (context.action === 'create_alert') {
        if (!context.alert)
          return cb(
            Error.Validation('You must supply alert id for proper redirection')
          )

        params.query.action = 'create_alert'
        params.query.alert_id = context.alert
      } else if (context.action === 'listing_inquiry') {
        if (!context.room)
          return cb(
            Error.Validation('You must supply room id for proper redirection')
          )

        params.query.action = 'listing_inquiry'
        params.query.room_id = context.room
      } else if (context.action === 'favorite_listing') {
        if (!context.listing)
          return cb(
            Error.Validation(
              'You must supply listing id for proper redirection'
            )
          )

        params.query.action = 'favorite_listing'
        params.query.listing_id = context.listing
      }

      const url = Url.web(params)
      return cb(null, url)
    }

    const url = Url.web(params)

    const data = {}

    const u = results.user
    const type = User.getLogicalType(u)
    if (type === 'RegisteredUser' || type === 'EmailShadowUser')
      data.email = u.email

    if (type === 'PhoneShadowUser') data.phone_number = u.phone_number

    data.receiving_user = u.id
    data.token = results.user.secondary_password
    data.action = 'UserActivation'
    data.agent = results.agent
    data['$desktop_url'] = url
    data['$fallback_url'] = url

    Branch.createURL(data).nodeify(cb)
  }

  /**
   * @param {Callback<string>} cb 
   * @param {{contacting_agent: IAgent; base_url: string; title: string;}} results 
   */
  const renderHTML = (cb, results) => {
    let template = __dirname + '/../../html/user/'
    template += results.contacting_agent ? 'activation_brand' : 'activation'
    template += '.html'

    if (!results.contacting_agent) {
      results.base_url = Url.web({})
      results.title = 'Activation'
    }

    render(template, results, cb)
  }

  /**
   * @param {Callback<IEmail>} cb 
   * @param {{user: IUser; html: string}} results 
   */
  const sendEmail = (cb, results) => {
    if (!User.shouldTryEmail(results.user)) return cb()

    Email.create({
      from: config.email.from,
      to: [results.user.email],
      html: results.html,
      subject: 'Activation for your Rechat Account'
    }).nodeify(cb)
  }

  /**
   * @param {Callback<string>} cb 
   * @param {any} results 
   */
  const renderText = (cb, results) => {
    const template = __dirname + '/../../asc/user/activation.asc'
    render(template, results, cb)
  }

  /**
   * @param {Callback<void>} cb 
   * @param {{user: IUser; text: string}} results 
   */
  const sendSMS = (cb, results) => {
    if (!User.shouldTrySMS(results.user)) return cb()

    return SMS.send(
      {
        from: config.twilio.from,
        to: results.user.phone_number,
        body: results.text
      },
      cb
    )
  }

  /**
   * @param {Callback<IBrand>} cb 
   */
  const getBrand = cb => {
    cb(null, Brand.getCurrent())
  }

  async.auto(
    {
      user: cb => User.get(user_id).nodeify(cb),
      agent: [
        'user',
        (cb, results) => Agent.matchByEmail(results.user.email).nodeify(cb)
      ],
      contacting_agent: cb => contacting_agent().nodeify(cb),
      brand: getBrand,
      url: ['user', 'contacting_agent', 'agent', createUrl],
      html: ['url', renderHTML],
      send_email: ['html', sendEmail],
      text: ['url', renderText],
      send_sms: ['url', 'contacting_agent', sendSMS]
    },
    cb
  )
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

    emitter.emit('upgrade', user_id)

    cb(err, user)
  })
}

/**
 * @param {UUID} user_id
 * @param {Callback<UUID>} cb
 */
User.createPersonalRoom = function(user_id, cb) {
  const copy = {
    room_type: 'Personal',
    owner: user_id
  }

  Room.create(copy).nodeify((err, room_id) => {
    if (err) return cb(err)

    db.query('user/update_personal_room', [user_id, room_id], (err, res) => {
      if (err) return cb(err)

      return cb(null, room_id)
    })
  })
}

User.getStatus = function(user, _cb) {
  if (typeof SocketServer !== 'undefined') {
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

/**
 * @param {IUserBase} user
 * @returns {boolean}
 */
User.shouldTryEmail = function(user) {
  // We don't have an email for this user
  if (!user.email) return false

  // Don't try sending an actual email to a fake email address
  if (user.fake_email) return false

  return true
}

/**
 * @param {IUserBase} user
 * @returns {boolean}
 */
User.shouldTrySMS = function(user) {
  // Dont send SMS. We're going to send an email.
  if (user.email && !user.fake_email) return false

  // Dont try sending an SMS. We dont have his number.
  if (!user.phone_number) return false

  return true
}

/**
 * @param {IUserBase} user
 * @returns {TUserLogicalType}
 */
User.getLogicalType = function(user) {
  if (user.email && !user.is_shadow && !user.fake_email) return 'RegisteredUser'
  else if (user.email && user.is_shadow && !user.fake_email)
    return 'EmailShadowUser'
  else if (user.phone_number && user.is_shadow && user.fake_email)
    return 'PhoneShadowUser'

  return 'Unknown'
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
