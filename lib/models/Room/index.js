const async = require('async')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const Orm = require('../Orm')
const Branch = require('../Branch')
const Brand = require('../Brand')
const Url = require('../Url')

const {
  get: getUser
} = require('../User/get')

const { validate } = require('./validate')

const Room = {
  ...require('./get'),
  ...require('./create'),
  ...require('./consts'),
  ...require('./users'),
  ...require('./recommendation'),
  ...require('./compose')

}

Orm.register('room', 'Room', Room)

/**
 * Updates a `room` after validating the whole object
 * @name update
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {UUID} room_id - ID of the referenced room
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
 * @param {UUID} room_id - ID of the referenced room
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
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name others
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {UUID} room_id - ID of the referenced room
 * @param {UUID} user_id - ID of the referenced user
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

Room.archive = function (room_id, user_id, cb) {
  Room.get(room_id, err => {
    if(err)
      return cb(err)

    getUser(user_id).nodeify(err => {
      if(err)
        return cb(err)

      db.query('room/archive', [room_id, user_id], cb)
    })
  })
}

Room.setNotificationSettings = function (user_id, room_id, setting, cb) {
  expect(Room.notificationSettingTypes).to.include(setting)

  async.auto({
    user: (cb, results) => {
      getUser(user_id).nodeify(cb)
    },
    room: (cb, results) => {
      Room.get(room_id, cb)
    },
    apply: [
      'user',
      'room',
      (cb, results) => {
        db.query('room/toggle_push_settings', [user_id, room_id, setting], cb)
      }
    ],
    final: [
      'apply',
      (cb, results) => {
        Room.get(room_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.final)
  })
}

Room.isPushOK = function (user_id, room_id, cb) {
  db.query('room/ok_push', [user_id, room_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, true)

    return cb(null, res.rows[0].ok)
  })
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

    Room.getAll(room_ids, (err, rooms) => {
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

    Room.getAll(room_ids, (err, rooms) => {
      if (err)
        return cb(err)

      rooms[0].total = res.rows[0].total
      return cb(null, rooms)
    })
  })
}

Room.getBranchLink = function({user_id, room_id, fallback}, cb) {
  const getBrand = (cb, results) => {
    if (!results.user.brand)
      return cb()

    Brand.get(results.user.brand).nodeify(cb)
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

    Branch.createURL(b).nodeify(cb)
  }

  async.auto({
    user: cb => getUser(user_id).nodeify(cb),
    brand: ['user', getBrand],
  }, build)
}

Room.associations = {
  owner: {
    optional: true,
    model: 'User'
  },

  users: {
    collection: true,
    model: 'User'
  },

  latest_message: {
    optional: true,
    model: 'Message'
  },

  latest_activity: {
    optional: true,
    model: 'Message'
  },

  attachments: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  },

  recommendations: {
    collection: true,
    enabled: false,
    model: 'Recommendation'
  }
}

Room.publicize = function(model) {
  if(model.users_info)
    delete model.users_info

  return model
}

module.exports = Room
