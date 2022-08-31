const { strict: assert } = require('assert')
const _u = require('underscore')
const async = require('async')
const uuid = require('uuid')

const config = require('../../config.js')

const promisify = require('../../utils/promisify')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const { html: render_html } = require('../../utils/render')
const Emitter = require('../../utils/event_emitter')

const User = require('./get')
const Activity = require('../Activity')
const Agent = require('../Agent')
const Brand = require('../Brand')
const Branch = require('../Branch')
const Crypto = require('../Crypto')
const ObjectUtil = require('../ObjectUtil')
const Recommendation = require('../Recommendation/patch')
const SMS = require('../SMS')
const Url = require('../Url')
const Listing = require('../Listing/recommendation')

const { hashPassword } = require('./password')

const { recommendListing } = require('../Recommendation/create')

const {
  create: createRoom
} = require('../Room/create')

const { connectToRoom, connectToUser } = require('./actions')

const { get: getListing } = require('../Listing/get')

const {
  get: getUser,
  getAll: getAllUsers,
  getByEmail: getUserByEmail,
  getByPhoneNumber: getUserByPhoneNumber,
  getLogicalType,
} = require('./get')

const {
  shouldTryEmail,
  shouldTrySMS,
} = require('./notification')

const { combineAndUniqueUserReferences } = require('./references')

const {
  get: getRoom
} = require('../Room/get')

const {
  create: createAlert
} = require('../Alert/create')

const invite = require('./invite')

const schema = {
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
    },

    daily_enabled: {
      type: 'boolean',
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

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
      user.is_shadow,
      user.brand,
      user.fake_email
    ]
  )
}

/**
 * Creates a `user` object
 * @param {IUserInput} user - full user object
 * @param {Callback<UUID>} cb - callback function
 */
const create = function(user, cb) {
  const brand = Brand.getCurrent()
  user.brand = brand ? brand.id : null

  /**
   * @param {UUID} user_id
   * @param {UUID=} peer_id
   * @param {*} source_type
   * @param {UUID} brand
   * @param {Callback<any>} cb
   */
  const handle_user_connect = (user_id, peer_id, source_type, brand, cb) => {
    return connectToUser(user_id, peer_id, source_type, brand, cb)
  }

  /**
   * @param {UUID=} user_id
   * @param {UUID=} room_id
   * @param {Callback<any>} cb
   */
  const handle_room_connect = (user_id, room_id, cb) => {
    return connectToRoom(user_id, room_id, cb)
  }

  /**
   *
   * @param {UUID} user_id
   * @param {UUID} listing_id
   * @param {any} external_info
   * @param {Callback<any>} cb
   */
  const handle_favorite_listing = (
    user_id,
    listing_id,
    external_info,
    cb
  ) => {
    async.auto(
      {
        user: cb => {
          return getUser(user_id).nodeify(cb)
        },
        recommendation: [
          'user',
          (cb, results) => {
            recommendListing(
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
          listing: listing_id
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
          return getUser(user_id).nodeify(cb)
        },
        alert: [
          'user',
          (cb, results) => {
            return createAlert(results.user.personal_room, alert, cb)
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
   * @param {UUID=} brand_id
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
          emailAvailable(user).nodeify(cb)
        }
      ],
      phone_available: [
        'validate',
        cb => {
          phoneAvailable(user).nodeify(cb)
        }
      ],
      hash_password: [
        'email_available',
        'phone_available',
        cb => {
          if (!user.password)
            return cb()

          hashPassword(user.password, cb)
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
          createPersonalRoom(results.insert, cb)
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
          return getUser(results.insert).nodeify(cb)
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

                    return getListing(r.listing, cb)
                  },
                  user: cb => {
                    if (!r.user) return cb()

                    return getUser(r.user).nodeify(cb)
                  },
                  room: cb => {
                    if (!r.room) return cb()

                    return getRoom(r.room, cb)
                  },
                  handle: [
                    'listing',
                    'user',
                    'room',
                    (cb, results) => {
                      if (r.action === 'favorite_listing') {
                        return handle_favorite_listing(
                          opts.get.id,
                          r.listing,
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

          const team = {}

          if (results.brand) {
            if (results.handle_actions) {
              for (const i in results.handle_actions)
                team[i] = results.handle_actions[i]
            }
          }

          return sendActivation(results.insert, team, cb)
        }
      ]
    },
    (err, results) => {
      if (err) return cb(err)

      Emitter.emit('user created', results.insert)
      return cb(null, results.insert)
    }
  )
}

const createPersonalRoom = function(user_id, cb) {
  const copy = {
    room_type: 'Personal',
    owner: user_id
  }

  createRoom(copy).nodeify((err, room_id) => {
    if (err) return cb(err)

    db.query('user/update_personal_room', [user_id, room_id], (err, res) => {
      if (err) return cb(err)

      return cb(null, room_id)
    })
  })
}

/**
 * Checks whether an email address address is available for registration
 * @param {{email: string}} arg1 - full user object
 */
const emailAvailable = async function({ email }) {
  const user = await getUserByEmail(email)

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
const phoneAvailable = async function({ phone_number }) {
  if (!phone_number) return

  const user = await getUserByPhoneNumber(phone_number)

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
 * @param {object} info
 * @param {IUser['email']?} [info.email]
 * @param {IUser['phone_number']?} [info.phone_number]
 * @param {IUser['first_name']?} [info.first_name]
 * @param {IUser['last_name']?} [info.last_name]
 * @returns {Promise<IUser['id']>}
 */
async function createShadow ({ email, phone_number, first_name, last_name }) {
  if (!email && !phone_number) {
    throw Error.Validation('At least one of email and phone_number is required')
  }

  return promisify(create)({
    first_name: first_name || email || '',
    last_name: last_name || '',
    email: email || ('guest+' + uuid.v1().replace(/-/g, '') + '@rechat.com'),
    user_type: 'Client',
    is_shadow: true,
    skip_confirmation: true,
    fake_email: Boolean(email),
    ...(phone_number ? { phone_number } : null),
  })
}

/**
 * @param {string} email
 * @param {{ first_name?: any; last_name?: any; }} info
 */
const getOrCreateByEmail = async function(email, info = {}) {
  const user = await getUserByEmail(email)

  if (user) return user

  const shadow_user = {
    first_name: info.first_name || email,
    last_name: info.last_name || '',
    email: email,
    user_type: 'Client',
    is_shadow: true,
    skip_confirmation: true
  }

  const id = await promisify(create)(shadow_user)

  return getUser(id)
}

const getOrCreateByPhoneNumber = function(phone, cb) {
  async.auto(
    {
      get_phone: cb => {
        return getUserByPhoneNumber(phone).nodeify(cb)
      },
      create: [
        'get_phone',
        (cb, results) => {
          const user = results.get_phone

          if (user) return cb(null, user)

          const shadow_user = {
            first_name: '',
            last_name: '',
            email: 'guest+' + uuid.v1().replace(/-/g, '') + '@rechat.com',
            phone_number: phone,
            user_type: 'Client',
            is_shadow: true,
            skip_confirmation: true,
            fake_email: true
          }

          return create(shadow_user, (err, id) => {
            if (err) return cb(err)

            return getUser(id).nodeify(cb)
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

const getOrCreateBulk = function(user_id, users, emails, phone_numbers, cb) {
  async.auto(
    {
      user: cb => {
        getUser(user_id).nodeify(cb)
      },
      users: cb => {
        getAllUsers(users).nodeify(cb)
      },
      emails: cb => {
        async.map(emails, (email, cb) => getOrCreateByEmail(email).nodeify(cb), cb)
      },
      phones: cb => {
        async.map(phone_numbers, getOrCreateByPhoneNumber, cb)
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

          const r = combineAndUniqueUserReferences(user_id, u, e, p)

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

const sendUserInvitation = async (user, brand_id, link) => {
  return invite(user, brand_id, link)
}

/**
 * @param {UUID} user_id
 * @param {IUserActivationContext} context
 */
const sendActivation = function(user_id, context, cb) {
  async function contacting_agent() {
    if (context.agent) return Agent.get(context.agent)

    const brand = Brand.getCurrent()

    if (!brand) {
      return
    }

    const agents = await Brand.proposeAgents(brand.id, user_id)
    if (agents.length < 1) {
      return
    }

    let agent_id
    for (let index = 0; index < agents.length; index++) {
      const row = agents[index]
      if (row.agent) {
        agent_id = row.agent
        break
      }
    }

    if (!agent_id) {
      return
    }

    return Agent.get(agent_id)
  }

  /**
   * @param {Callback<IEmail>} cb
   * @param {{user: IUser; brand: IBrand, url: string}} results
   */
  const sendEmail = (cb, results) => {
    if (!shouldTryEmail(results.user)) return cb()

    sendUserInvitation(results.user, results.brand ? results.brand.id : undefined, results.url).nodeify(cb)

  }

  /**
   * @param {Callback<string>} cb
   * @param {any} results
   */
  const renderText = (cb, results) => {
    const template = __dirname + '/../../asc/user/activation.asc'
    render_html(template, results, cb)
  }

  /**
   * @param {Callback<void>} cb
   * @param {{user: IUser; text: string}} results
   */
  const sendSMS = (cb, results) => {
    if (!shouldTrySMS(results.user)) return cb()

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

  const createUrl = (cb, results) => {
    getActivationLink({
      user: results.user,
      agent: results.agent
    }, context).nodeify(cb)
  }

  async.auto(
    {
      user: cb => getUser(user_id).nodeify(cb),
      agent: [
        'user',
        (cb, results) => Agent.matchByEmail(results.user.email).nodeify(cb)
      ],
      contacting_agent: cb => contacting_agent().nodeify(cb),
      brand: getBrand,
      url: ['user', 'contacting_agent', 'agent', createUrl],
      send_email: ['url', 'brand', sendEmail],
      text: ['url', renderText],
      send_sms: ['url', 'contacting_agent', sendSMS]
    },
    cb
  )
}

const getActivationLink = async ({user, agent}, context) => {
  const params = {
    uri: '/branch'
  }

  if (context && context.action) {
    params.query = {
      token: Crypto.encrypt(
        JSON.stringify({
          email: user.email,
          token: user.secondary_password
        })
      )
    }

    if (context.action === 'create_alert') {
      if (!context.alert)
        throw Error.Validation('You must supply alert id for proper redirection')

      params.query.action = 'create_alert'
      params.query.alert_id = context.alert
    } else if (context.action === 'listing_inquiry') {
      if (!context.room)
        throw Error.Validation('You must supply room id for proper redirection')

      params.query.action = 'listing_inquiry'
      params.query.room_id = context.room
    } else if (context.action === 'favorite_listing') {
      if (!context.listing)
        throw Error.Validation('You must supply listing id for proper redirection')

      params.query.action = 'favorite_listing'
      params.query.listing_id = context.listing
    }

    return Url.web(params)
  }

  const url = Url.web(params)

  const data = {}

  const type = getLogicalType(user)
  if (type === 'RegisteredUser' || type === 'EmailShadowUser')
    data.email = user.email

  if (type === 'PhoneShadowUser') data.phone_number = user.phone_number

  data.receiving_user = user.id
  data.token = user.secondary_password
  data.action = 'UserActivation'
  data.agent = agent
  data['$desktop_url'] = url
  data['$fallback_url'] = url

  return Branch.createURL(data)
}

module.exports = {
  create,
  getOrCreateByEmail,
  getOrCreateByPhoneNumber,
  getOrCreateBulk,
  sendActivation,
  getActivationLink,
  sendUserInvitation,
  createShadow,
}
