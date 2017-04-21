/**
 * @namespace Room
 */

const _u = require('underscore')
const async = require('async')
const EventEmitter = require('events').EventEmitter
const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

Room = new EventEmitter()

Orm.register('room', Room)

/**
 * * `Group`
 * * `Direct`
 * @typedef room_type
 * @type {string}
 * @memberof Room
 * @instance
 * @enum {string}
 */

/**
 * @typedef room
 * @type {object}
 * @memberof Room
 * @instance
 * @property {uuid} id - ID of this `room`
 * @property {string} title - Room title.
 * @property {Room#room_type} room_type - Type of this room, that's either `Direct` or `Group`.
 * @property {User#user=} owner - Owner of this room.
 * @property {User#user[]} users - List of all the members of this room.
 * @property {timestamp} created_at - Indicates when this object was created.
 * @property {timestamp=} updated_at - Indicates when this object was last modified.
 * @property {timestamp=} deleted_at - Indicates when this object was deleted.
 */

/**
 * External information on a listing
 * @typedef external_info
 * @type {object}
 * @memberof Room
 * @instance
 * @property {uuid} ref_object_id - Referencing object ID. This is usually the ID of an alert causing
 * this recommendation to surface, but also can be the user manually recommending this listing.
 * @property {string} source - Overrides the source of this listing. The default value is `MLS`
 * @property {string} source_url - Overrides the source url of this listing. This is usually the webpage that a user invokes our chrome-extension
 * on to recommend a listing manually.
 */

const schema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: false
    },

    room_type: {
      type: 'string',
      required: true,
      enum: [ 'Group', 'Direct', 'Personal' ]
    },

    users: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        uuid: true
      }
    },

    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        phone: true
      }
    },

    emails: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        email: true
      }
    }
  }
}

const validate = validator.bind(null, schema)

/**
 * Inserts a `room` object into database
 * @memberof Room
 * @instance
 * @public
 * @param {room} room - full room object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the room created
 */
function insert (room, cb) {
  db.query('room/insert', [
    room.room_type,
    room.title,
    room.owner
  ], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].id)
  })
}

/**
 * Adds a `user` to a `room`
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being added
 * @param {uuid} room_id - ID of the room the user being added to
 */
function add_user (user_id, room_id, reference, cb) {
  db.query('room/add_user', [user_id, room_id, reference], function (err, res) {
    if (err) {
      if (err.code === '23505') {
        return cb(Error.Conflict())
      }

      return cb(err)
    }

    return cb()
  })
}

function listing_notification (listing, room, user, recommendation_id, external_info, cb) {
  const address_line = Address.getLocalized(listing.property.address)
  const notification = {}

  if (external_info.notification === 'Hit') {
    return cb()
    // notification.subject = listing.id
    // notification.subject_class = 'Listing'
    // notification.object = room.id
    // notification.object_class = 'Room'
    // notification.auxiliary_subject = (external_info.ref_alert_id) ?
    //   external_info.ref_alert_id : external_info.ref_user_id
    // notification.auxiliary_subject_class = (external_info.ref_alert_id) ?
    //   'Alert' : 'User'
    // notification.recommendation = recommendation_id
    // notification.room = room.id
    // notification.action = 'BecameAvailable'
    // notification.message = '#' + room.proposed_title + ': ' + address_line + ' just hit the market'
    //
    // console.log('↯'.cyan, 'Recommending Listing with MUI:',
    //             ('#' + listing.matrix_unique_id).red,
    //             '('.cyan, listing.id.yellow, ')'.cyan,
    //             '*'.blue, address_line, '*'.blue,
    //             'MLS#:'.white, listing.mls_number.yellow,
    //             'to Room #', room.proposed_title.magenta,
    //             'with ID:'.cyan, room.id.yellow,
    //             'invoked by', notification.auxiliary_subject_class,
    //             'with ID:'.cyan, notification.auxiliary_subject.red
    //            )
    // return Notification.issueForRoom(notification, cb)
  } else if (external_info.notification === 'Share') {
    notification.subject = user.id
    notification.subject_class = 'User'
    notification.object = listing.id
    notification.object_class = 'Listing'
    notification.recommendation = recommendation_id
    notification.room = room.id
    notification.action = 'Shared'
    notification.message = '#' + room.proposed_title + ': ' + '@' + user.first_name + ' shared ' + address_line

    console.log('↵'.cyan, 'User', user.first_name.magenta, user.last_name.magenta, 'with ID:', user.id.yellow,
                'Shared a Listing with MUI:',
                ('#' + listing.matrix_unique_id).red,
                '('.cyan, listing.id.yellow, ')'.cyan,
                '*'.blue, address_line, '*'.blue,
                'MLS#:'.white, listing.mls_number.yellow,
                'with Room #', room.proposed_title.magenta,
                'ID:', room.id.yellow.cyan)

    return Notification.issueForRoomExcept(notification, user.id, cb)
  }

  return cb()
}

/**
 * Retrieves a full `room` object
 * @name get
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the room being retrieved
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.get = function (room_id, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('room/get', [room_id, user_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Room not found'))

    const room = res.rows[0]

    Room.getTitle(room, (err, title) => {
      if (err)
        return cb(err)

      room.proposed_title = title
      cb(null, room)
    })
  })
}

/**
 * Creates a `room`
 * @name create
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {Room#room} room - full room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.create = function (room, cb) {
  async.auto({
    validate: function (cb) {
      validate(room, cb)
    },
    user: function (cb) {
      if (room.owner)
        return User.get(room.owner, cb)

      return cb()
    },
    insert: [
      'validate',
      'user',
      (cb, results) => {
        insert(room, cb)
      }
    ],
    add_owner: [
      'validate',
      'user',
      'insert',
      (cb, results) => {
        if (room.owner)
          return Room.addUser({
            inviting_id: false,
            user_id: room.owner,
            room_id: results.insert,
            connect_override: false,
            reference: room.owner_reference
          }, cb)

        return cb()
      }
    ],
    add_users: [
      'validate',
      'user',
      'insert',
      'add_owner',
      (cb, results) => {
        async.map(room.users, function (r, cb) {
          const u = process.domain.user.id || room.owner || false
          return Room.addUser({
            inviting_user: u,
            user_id: r,
            room_id: results.insert,
            connect_override: false
          }, cb)
        }, err => {
          if (err)
            return cb(err)

          return cb()
        })
      }
    ],
    room: [
      'validate',
      'user',
      'insert',
      'add_owner',
      'add_users',
      (cb, results) => {
        Room.get(results.insert, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.room)
  })
}

Room.compose = function(room, cb) {
  async.auto({
    email_shadows: (cb, results) => {
      return async.map(room.emails, (r, cb) => {
        User.getOrCreateByEmail(r, (err, user) => {
          if(err)
            return cb(err)

          return cb(null, user.id)
        })
      }, cb)
    },
    phone_shadows: (cb, results) => {
      return async.map(room.phone_numbers, (r, cb) => {
        User.getOrCreateByPhoneNumber(r, (err, user) => {
          if(err)
            return cb(err)

          return cb(null, user.id)
        })
      }, cb)
    }
  }, (err, results) => {
    if(err)
      return cb(err)

    const e = results.email_shadows || []
    const p = results.phone_shadows || []
    const u = room.users || []
    const self = room.owner || null

    const users = _u.unique(u.concat(e).concat(p).concat(self).filter(Boolean))
    if(users.length === 2)
      return User.getOrCreateDirectRoom(users[0], users[1], cb)

    room.users = _u.without(users, self)

    return Room.create(room, cb)
  })
}

/**
 * Updates a `room` after validating the whole object
 * @name update
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {Room#room} room - partial room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.update = function (room_id, room, cb) {
  async.auto({
    validate: cb => {
      return validate(room, cb)
    },
    constraints: cb => {
      if (room.room_type === 'Direct')
        return cb(Error.Validation('Cannot manually create a private room'))

      return cb()
    },
    get: cb => {
      return Room.get(room_id, cb)
    },
    update: [
      'validate',
      'constraints',
      'get',
      cb => {
        return db.query('room/update', [
          room.title,
          room.owner,
          room.room_type,
          room_id
        ], cb)
      }
    ],
    after: [
      'update',
      cb => {
        return Room.get(room_id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.after)
  })
}

/**
 * Patches a `room` object with new parameters
 * @name patch
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {Room#room} room - full room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.patch = function (room_id, room, cb) {
  Room.get(room_id, function (err, data) {
    if (err)
      return cb(err)

    if (data.owner)
      data.owner = data.owner.id

    for (const i in room)
      data[i] = room[i]

    Room.update(room_id, data, function (err, res) {
      if (err)
        return cb(err)

      Room.get(room_id, function (err, room) {
        if (err)
          return cb(err)

        return cb(null, room)
      })
    })
  })
}

/**
 * Retrieves all `room` objects that a particular user is a member of
 * @name getUserRooms
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {Room#room[]} collection of rooms
 */
Room.getUserRooms = function (user_id, paging, cb) {
  db.query('room/user_rooms', [user_id, paging.type, paging.timestamp, paging.limit, paging.room_type], (err, res) => {
    if (err)
      return cb(err)

    const room_ids = res.rows.map(r => {
      return r.id
    })

    async.map(room_ids, Room.get, (err, rooms) => {
      if (err)
        return cb(err)

      if (res.rows.length > 0) {
        rooms[0].total = res.rows[0].total
        rooms[0].new = res.rows[0].new
      }

      return cb(null, rooms)
    })
  })
}

/**
 * Retrievs all the members of a `room`
 * @name getUsers
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {User#user[]} collection of room members
 */
Room.getUsers = function (room_id, cb) {
  Room.getUsersIDs(room_id, (err, user_ids) => {
    if (err)
      return cb(err)

    async.map(user_ids, User.get, (err, users) => {
      if (err)
        return cb(err)

      return cb(null, users)
    })
  })
}

/**
 * Retrievs IDs of all the members of a `room`
 * @name getUsersIDs
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {uuid[]} collection of room members UUIDs
 */
Room.getUsersIDs = function (room_id, cb) {
  db.query('room/get_users', [room_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, false)

    const user_ids = res.rows.map(r => {
      return r.id
    })

    return cb(null, user_ids)
  })
}

/**
 * Checks whether a `user` is a member of this `room`
 * @name isMember
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.isMember = function (user_id, room_id, cb) {
  db.query('room/is_member', [room_id, user_id], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, (res.rows[0].is_member >= 1) ? true : false)
  })
}

/**
 * Adds a `user` to this `room`
 * @name addUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.addUser = function ({inviting_id, user_id, room_id, connect_override, reference}, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    inviting_user: cb => {
      if(!inviting_id)
        return cb()

      User.get(inviting_id, cb)
    },
    room: cb => {
      Room.get(room_id, cb)
    },
    others: [
      'user',
      'room',
      cb => {
        Room.others(room_id, user_id, cb)
      }
    ],
    add_user: [
      'user',
      'room',
      cb => {
        add_user(user_id, room_id, reference, cb)
      }
    ],
    connect: [
      'user',
      'room',
      'others',
      'add_user',
      (cb, results) => {
        async.map(results.others, function (r, cb) {
          Contact.connect(user_id, r, connect_override, cb)
        }, cb)
      }
    ],
    invite_notification: [
      'user',
      'inviting_user',
      'room',
      'add_user',
      (cb, results) => {
        if (!results.inviting_user)
          return cb()

        // Since direct rooms have no owner, all users are being passed using
        // users parameters. We should not create a push notification when inviting_user
        // is the same user being invited. This only happens in the the case of direct messages
        if (inviting_id === user_id)
          return cb()

        const notification = {}

        const invited_name = User.getAbbreviatedDisplayName(results.user)
        const inviting_name = User.getAbbreviatedDisplayName(results.inviting_user)
        notification.message = inviting_name + ' invited ' + invited_name + ' to join #' + results.room.proposed_title
        notification.action = 'Invited'
        notification.subject = inviting_id
        notification.subject_class = 'User'
        notification.object = room_id
        notification.object_class = 'Room'
        notification.auxiliary_object = user_id
        notification.auxiliary_object_class = 'User'
        notification.room = room_id

        return Notification.issueForRoomExcept(notification, inviting_id, cb)
      }
    ],
    notification: [
      'user',
      'room',
      (cb, results) => {
        Room.emit('user added', {
          user: results.user,
          room: results.room
        })

        return cb()
      }
    ]
  }, cb)
}

/**
 * Creates a `room` of type `Direct` between two users
 * @name createPrivateMessage
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} peer_id - ID of the second referenced user
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the created room
 */
Room.createDirect = function (user_id, peer_id, cb) {
  const room = {
    room_type: 'Direct',
    users: [ user_id, peer_id ]
  }

  Room.create(room, function (err, room) {
    if (err)
      return cb(err)

    return cb(null, room.id)
  })
}

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name others
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {uuid[]} A collection of IDs
 */
Room.others = function (room_id, user_id, cb) {
  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    db.query('room/others', [room_id, user_id], function (err, res) {
      if (err)
        return cb(err)

      const others_ids = res.rows.map(function (r) {
        return r.user
      })

      return cb(null, others_ids)
    })
  })
}

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name hideOrphanedRecommendations
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.hideOrphanedRecommendations = function (room_id, cb) {
  db.query('room/hide_orphaned_recs', [room_id], cb)
}

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name isDup
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.isDup = function (room_id, listing_id, cb) {
  db.query('room/dup', [room_id, listing_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, false)

    return cb(null, res.rows[0].id)
  })
}

Room.getRecommendation = function (room_id, listing_id, cb) {
  db.query('room/get_recommendation', [room_id, listing_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    return cb(null, res.rows[0].id)
  })
}

/**
 * Recommends a `Listing` to the specified `room`. We expect `ref_object_id` be present
 * in the external_info object as a mandatory field. This method automatically adds invoking
 * alert to the list of referring_objects.
 * @name recommendListing
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {external_info} external_info - external information on a listing object
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation}
 */
Room.recommendListing = function (room_id, listing_id, external_info, cb) {
  if (!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'))

  if (external_info.ref_user_id && (external_info.notification !== 'Share' &&
                                    external_info.notification !== 'None' &&
                                    !_u.isUndefined(external_info.notification)))
    return cb(Error.Validation('Reference is a user, but notification type indicates otherwise'))

  if (external_info.ref_alert_id && (external_info.notification !== 'Hit' &&
                                     external_info.notification !== 'None' &&
                                     !_u.isUndefined(external_info.notification)))
    return cb(Error.Validation('Reference is an alert, but notification type indicates otherwise'))

  const ref_id = external_info.ref_alert_id || external_info.ref_user_id

  async.auto({
    room: cb => {
      Room.get(room_id, cb)
    },
    listing: cb => {
      Listing.get(listing_id, cb)
    },
    recommendation: [
      'room',
      'listing',
      (cb, results) => {
        const recommendation = {}

        recommendation.source = external_info.source || 'MLS'
        recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/'
        recommendation.room = room_id
        recommendation.referring_objects = '{' + ref_id + '}'
        recommendation.listing = listing_id
        recommendation.recommendation_type = 'Listing'
        recommendation.matrix_unique_id = results.listing.matrix_unique_id

        return cb(null, recommendation)
      }
    ],
    insert: [
      'room',
      'listing',
      'recommendation',
      (cb, results) => {
        return Recommendation.create(results.recommendation, cb)
      }
    ],
    dup: [
      'room',
      'listing',
      'insert',
      (cb, results) => {
        if (results.insert)
          return cb()

        const opts = results

        async.auto({
          add_reference_to_recommendation: cb => {
            Recommendation.addReferenceToRecommendations(room_id, listing_id, ref_id, cb)
          },
          map: cb => {
            Room.getRecommendation(room_id, listing_id, cb)
          },
          user: cb => {
            if (!external_info.ref_user_id)
              return cb()

            return User.get(external_info.ref_user_id, cb)
          },
          unhide_recommendation: [
            'add_reference_to_recommendation',
            'map',
            (cb, results) => {
              Recommendation.unhide(results.map, cb)
            }
          ],
          notifications: [
            'add_reference_to_recommendation',
            'user',
            'unhide_recommendation',
            (cb, results) => {
              if (external_info.notification === 'Share')
                listing_notification(opts.listing, opts.room, results.user, results.map, external_info, cb)
              else
                return cb()
            }
          ]
        }, (err, results) => {
          if (err)
            return cb(err)

          return cb(null, results.map)
        })
      }
    ],
    not_dup: [
      'room',
      'listing',
      'insert',
      (cb, results) => {
        if (!results.insert)
          return cb()

        const opts = results

        async.auto({
          user: cb => {
            if (!external_info.ref_user_id)
              return cb()

            return User.get(external_info.ref_user_id, cb)
          },
          notifications: [
            'user',
            (cb, results) => {
              listing_notification(opts.listing, opts.room, results.user, opts.insert, external_info, cb)
            }
          ]
        }, (err, results) => {
          if (err)
            return cb(err)

          return cb(null, opts.insert)
        })
      }
    ],
    activity: [
      'room',
      'listing',
      'insert',
      'dup',
      'not_dup',
      (cb, results) => {
        if (!external_info || !external_info.ref_user_id || !(external_info.notification === 'Share'))
          return cb()

        const activity = {
          action: 'UserSharedListing',
          object: listing_id,
          object_class: 'listing'
        }

        Activity.add(external_info.ref_user_id, 'User', activity, cb)
      }
    ],
    get: [
      'dup',
      'not_dup',
      (cb, results) => {
        const r = results.not_dup || results.dup

        Recommendation.get(r, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.get)
  })
}

Room.recommendListings = function (room_id, listing_ids, external_info, cb) {
  if (!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'))

  if (external_info.ref_user_id && (external_info.notification !== 'Share' &&
                                    external_info.notification !== 'None' &&
                                    !_u.isUndefined(external_info.notification)))
    return cb(Error.Validation('User is a reference, but notification type indicates otherwise'))

  if (external_info.ref_alert_id && (external_info.notification !== 'Hit' &&
                                     external_info.notification !== 'None' &&
                                     !_u.isUndefined(external_info.notification)))
    return cb(Error.Validation('Alert is a reference, but notification type indicates otherwise'))

  const ref_id = external_info.ref_alert_id || external_info.ref_user_id

  Room.get(room_id, (err, room) => {
    if(err)
      return cb(err)

    const processListing = (listing_id, cb) => {
      async.auto({
        listing: cb => {
          Listing.get(listing_id, cb)
        },
        recommendation: [
          'listing',
          (cb, results) => {
            const recommendation = {}

            recommendation.source = external_info.source || 'MLS'
            recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/'
            recommendation.room = room_id
            recommendation.referring_objects = '{' + ref_id + '}'
            recommendation.listing = listing_id
            recommendation.recommendation_type = 'Listing'
            recommendation.matrix_unique_id = results.listing.matrix_unique_id

            return cb(null, recommendation)
          }
        ],
        insert: [
          'listing',
          'recommendation',
          (cb, results) => {
            return Recommendation.create(results.recommendation, cb)
          }
        ],
        dup: [
          'listing',
          'insert',
          (cb, results) => {
            if (results.insert)
              return cb()

            async.auto({
              add_reference_to_recommendation: cb => {
                Recommendation.addReferenceToRecommendations(room_id, listing_id, ref_id, cb)
              },
              map: cb => {
                Room.getRecommendation(room_id, listing_id, cb)
              },
              unhide_recommendation: [
                'add_reference_to_recommendation',
                'map',
                (cb, results) => {
                  Recommendation.unhide(results.map, cb)
                }
              ]
            }, (err, results) => {
              if (err)
                return cb(err)

              return cb(null, results.map)
            })
          }
        ],
        not_dup: [
          'listing',
          'insert',
          (cb, results) => {
            if (!results.insert)
              return cb()

            const opts = results

            async.auto({
              user: cb => {
                if (!external_info.ref_user_id)
                  return cb()

                return User.get(external_info.ref_user_id, cb)
              },
              notifications: [
                'user',
                (cb, results) => {
                  listing_notification(opts.listing, room, results.user, opts.insert, external_info, cb)
                }
              ]
            }, (err, results) => {
              if (err)
                return cb(err)

              return cb(null, opts.insert)
            })
          }
        ],
        get: [
          'dup',
          'not_dup',
          (cb, results) => {
            const r = results.not_dup || results.dup

            return Recommendation.get(r, cb)
          }
        ]
      }, (err, results) => {
        if (err)
          return cb(err)

        return cb(null, results.get)
      })
    }

    async.each(listing_ids, processListing, cb)
  })
}

/**
 * Strips unwanted information from a `room` object
 * that leading agent.
 * @name getNewCounts
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {Room#new_counts}
 */
Room.getNewCounts = function (room_id, user_id, cb) {
  db.query('room/new_counts', [room_id, user_id], function (err, res) {
    if (err)
      return cb(err)

    return cb(null, res.rows[0])
  })
}

/**
 * Personalized response for `room` object for a specified user
 * @name getForUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {Room#room}
 */
Room.getForUser = function (room_id, user_id, cb) {
  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    Room.getNewCounts(room_id, user_id, function (err, counts) {
      if (err)
        return cb(err)

      return cb(null, room)
    })
  })
}

/**
 * Removes user from a `room`
 * @name removeUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.removeUser = function (room_id, user_id, cb) {
  Room.get(room_id, (err, room) => {
    if (err)
      return cb(err)

    if (room.room_type === 'Personal' || room.room_type === 'Direct')
      return cb(Error.NotAcceptable('You cannot leave your personal room or a direct message'))

    User.get(user_id, (err, user) => {
      if (err)
        return cb(err)

      db.query('room/leave', [room_id, user_id], cb)
    })
  })
}

Room.archive = function (room_id, user_id, cb) {
  Room.get(room_id, err => {
    if(err)
      return cb(err)

    User.get(user_id, err => {
      if(err)
        return cb(err)

      db.query('room/archive', [room_id, user_id], cb)
    })
  })
}
/**
 * Retrieves messages with different media types (photos, videos, documents, etc) from a `room`
 * @name getMedia
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.getMedia = function (room_id, paging, cb) {
  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    db.query('room/media', [room_id, paging.type, paging.timestamp, paging.limit], function (err, res) {
      if (err)
        return cb(err)

      const message_ids = res.rows.map(function (r) {
        return r.id
      })

      async.map(message_ids, Message.get, function (err, messages) {
        if (err)
          return cb(err)

        return cb(null, messages)
      })
    })
  })
}

Room.setPushSettings = function (user_id, room_id, enable, cb) {
  db.query('room/toggle_push_settings', [user_id, room_id, enable], function (err, res) {
    if (err)
      return cb(err)

    return cb()
  })
}

Room.isPushOK = function (user_id, room_id, cb) {
  db.query('room/ok_push', [user_id, room_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, true)

    return cb(null, res.rows[0].ok)
  })
}

Room.belongs = function (members, user) {
  const member_ids = members.map(function (r) {
    return r.id
  })

  if (!user || (member_ids.indexOf(user) !== -1))
    return true

  return false
}

Room.stringSearch = function (user_id, terms, limit, room_types, cb) {
  terms = terms.map(r => {
    return '%' + r + '%'
  })

  db.query('room/string_search', [user_id, terms, limit, room_types], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const room_ids = res.rows.map(r => {
      return r.id
    })

    async.map(room_ids, Room.get, (err, rooms) => {
      if (err)
        return cb(err)

      rooms[0].total = res.rows[0].total
      return cb(null, rooms)
    })
  })
}

Room.stringSearchFuzzy = function (user_id, terms, limit, similarity, room_types, cb) {
  terms = terms.join('|')

  db.query('room/string_search_fuzzy', [user_id, terms, limit, similarity, room_types], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const room_ids = res.rows.map(r => {
      return r.id
    })

    async.map(room_ids, Room.get, (err, rooms) => {
      if (err)
        return cb(err)

      rooms[0].total = res.rows[0].total
      return cb(null, rooms)
    })
  })
}

Room.arrayMatch = function (array, terms) {
  array = array.filter(Boolean)

  for (const i in array) {
    for (const j in terms) {
      const r = new RegExp(terms[j], 'i')
      const t = array[i].match(r)
      if (_u.isNull(t))
        return true
    }
  }

  return false
}

Room.bulkCreateWithUsers = function (user, users, override, cb) {
  const room = {
    room_type: 'Group',
    owner: user,
    title: override.title || undefined
  }

  async.map(users, (r, cb) => {
    async.auto({
      room: cb => {
        Room.create(room, cb)
      },
      add_peer: [
        'room',
        (cb, results) => {
          Room.addUser({
            inviting_id: user,
            user_id: r,
            room_id: results.room.id,
            connect_override: override.connect
          }, cb)
        }
      ],
      message: [
        'add_peer',
        'room',
        (cb, results) => {
          if (!override.message)
            return cb()

          const message = {
            author: override.from || user,
            message_type: 'TopLevel',
            comment: override.message
          }

          return Message.post(results.room.id, message, true, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, results.room.id)
    })
  }, cb)
}

Room.bulkSendPrivateToUsers = function (user, users, override, cb) {
  async.map(users, (r, cb) => {
    async.auto({
      room: cb => {
        User.getOrCreateDirectRoom(user, r, cb)
      },
      message: [
        'room',
        (cb, results) => {
          if (!override.message)
            return cb()

          const message = {
            author: override.from || user,
            message_type: 'TopLevel',
            comment: override.message
          }

          return Message.post(results.room.id, message, true, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, results.room.id)
    })
  }, cb)
}

Room.bulkSendMessage = function (user, rooms, message, cb) {
  message.author = user

  async.map(rooms, function (r, cb) {
    Message.post(r, message, true, cb)
  }, cb)
}

Room.searchForUsers = function(user_id, users, cb) {
  let all = !_u.isEmpty(users) ? users : []
  all = _u.unique(all.concat(user_id))

  db.query('room/search_users', [user_id, all], (err, res) => {
    if(err)
      return cb(err)

    if(res.rows.length < 1)
      return cb(null, [])

    async.map(res.rows, (r, cb) => {
      return Room.get(r.id, cb)
    }, (err, results) => {
      if(err)
        return cb(err)

      return cb(null, results)
    })
  })
}

Room.searchForParties = function(user_id, users, emails, phones, cb) {
  User.combineUserReferences(user_id, users, emails, phones, (err, results) => {
    if(err)
      return cb(err)

    if(_u.isEmpty(results.users) || results.non_existing)
      return cb(null, [])

    return Room.searchForUsers(user_id, results.users, cb)
  })
}

Room.resolveRoomForSeamless = function(user_id, phone, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    resolve: [
      'user',
      cb => {
        db.query('room/seamless_resolve_room', [user_id, phone], (err, res) => {
          if(err)
            return cb(err)

          if (res.rows.length < 1)
            return cb()

          return cb(null, res.rows[0].id)
        })
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.resolve)
  })
}

Room.resolvePhoneForSeamless = function(user_id, room_id, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    room: cb => {
      Room.get(room_id, cb)
    },
    resolve: [
      'user',
      'room',
      (cb, results) => {
        db.query('room/seamless_resolve_phone', [user_id, room_id], (err, res) => {
          if(err)
            return cb(err)

          if (res.rows.length < 1)
            return cb()

          return cb(null, res.rows[0].phone_number)
        })
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.resolve)
  })
}

Room.getBranchLink = function({user_id, room_id, fallback}, cb) {
  const getBrand = (cb, results) => {
    if (!results.user.brand)
      return cb()

    Brand.get(results.user.brand, cb)
  }

  const build = (err, results) => {
    if (err)
      return cb(err)

    const url = Url.web({
      uri: '/branch',
      brand: results.brand
    })

    const b = {}
    b.room = room_id
    b.action = 'RedirectToRoom'
    b.receiving_user = results.user.id
    b.token = results.user.secondary_password
    b.email = results.user.email

    if (results.user.phone_number)
      b.phone_number = results.user.phone_number

    b['$desktop_url'] = url

    //By default, fallback is enabled. so being null means its enabled. Disable it only if its false.
    if (fallback !== false)
      b['$fallback_url'] = url

    Branch.createURL(b, cb)
  }

  async.auto({
    user: cb => User.get(user_id, cb),
    brand: ['user', getBrand],
  }, build)
}

Room.getTitleForUser = function (room, user, cb) {
  Room.getUsers(room.id, (err, users) => {
    if (err)
      return cb(err)

    const p = users || []

    let names = p.map(u => {
      if (user && user.id === u.id)
        return false

      return User.getAbbreviatedDisplayName(u)
    })

    names = names.filter(Boolean)

    if (names.length === 0) {
      if (user)
        return cb(null, User.getAbbreviatedDisplayName(user))

      return cb(null, 'Empty')
    }

    if (names.length < 3)
      return cb(null, names.join(', '))

    if (names.length === 3)
      return cb(null, [names[0], names[1]].join(',') + ' and ' + names[2])

    cb(null, (names.slice(0, 2).join(', ') + ' + ' + (names.length - 2) + ' others'))
  })
}

Room.getTitle = function(room, cb) {
  if (process && process.domain && process.domain.user)
    return Room.getTitleForUser(room, process.domain.user, cb)

  return Room.getTitleForUser(room, false, cb)
}

Room.associations = {
  owner: {
    optional: true,
    model: 'User'
  },

  users: {
    collection: true,
    ids: (r, cb) => Room.getUsersIDs(r.id, cb),
    model: 'User'
  },

  latest_message: {
    optional: true,
    model: 'Message'
  }
}

module.exports = function () {}
