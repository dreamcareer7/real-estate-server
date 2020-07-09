const db = require('../../utils/db.js')
const async = require('async')

const {
  get
} = require('./get')

const {
  get: getUser
} = require('../User/get')

const { validate } = require('./validate')

const update = function (room_id, room, cb) {
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
      return get(room_id, cb)
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
        return get(room_id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.after)
  })
}

const patch = function (room_id, room, cb) {
  get(room_id, function (err, data) {
    if (err)
      return cb(err)

    if (data.owner)
      data.owner = data.owner.id

    for (const i in room)
      data[i] = room[i]

    update(room_id, data, function (err, res) {
      if (err)
        return cb(err)

      get(room_id, function (err, room) {
        if (err)
          return cb(err)

        return cb(null, room)
      })
    })
  })
}

const archive = function (room_id, user_id, cb) {
  get(room_id, err => {
    if(err)
      return cb(err)

    getUser(user_id).nodeify(err => {
      if(err)
        return cb(err)

      db.query('room/archive', [room_id, user_id], cb)
    })
  })
}

module.exports = {
  patch,
  update,
  archive
}
