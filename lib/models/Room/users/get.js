const _u = require('underscore')
const async = require('async')

const db = require('../../../utils/db.js')

const {
  get: getUser
} = require('../../User/get')

const {
  combineUserReferences
} = require('../../User/references')

const { get, getAll } = require('../get')

/**
 * Retrieves all `room` objects that a particular user is a member of
 */
const getUserRooms = function (user_id, paging, cb) {
  db.query('room/user_rooms', [user_id, paging.type, paging.timestamp, paging.limit, paging.room_type], (err, res) => {
    if (err)
      return cb(err)

    const room_ids = res.rows.map(r => r.id)

    if (room_ids.length < 1)
      return cb(null, [])

    getAll(room_ids, (err, rooms) => {
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

const getUserRoomIds = async user_id => {
  const res = await db.query.promise('room/user/all-rooms', [user_id])
  return res.rows.map(r => r.room)
}

const getUserPeers = async user_id => {
  const res = await db.query.promise('room/user/peers', [user_id])
  return res.rows.map(r => r.user)
}

const searchForUsers = function(user_id, users, room_types, cb) {
  let all = !_u.isEmpty(users) ? users : []
  all = _u.uniq(all.concat(user_id))

  if (!room_types)
    room_types = ['Group', 'Direct']

  db.query('room/search_users', [
    user_id,
    all,
    room_types
  ], (err, res) => {
    if(err)
      return cb(err)

    if(res.rows.length < 1)
      return cb(null, [])

    async.map(res.rows, (r, cb) => {
      return get(r.id, cb)
    }, (err, results) => {
      if(err)
        return cb(err)

      return cb(null, results)
    })
  })
}

const searchForParties = function({user_id, users, emails, phones, room_types}, cb) {
  combineUserReferences(user_id, users, emails, phones, (err, results) => {
    if(err)
      return cb(err)

    if(_u.isEmpty(results.users) || results.non_existing)
      return cb(null, [])

    return searchForUsers(user_id, results.users, room_types, cb)
  })
}

const getUsers = room_ids => {
  return db.select('room/user/get-users', [room_ids])
}

const belongs = function (member_ids, user_id) {
  if (user_id && member_ids.indexOf(user_id) > -1)
    return true

  return false
}

const resolveRoomForSeamless = function(user_id, phone, cb) {
  async.auto({
    user: cb => {
      getUser(user_id).nodeify(cb)
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

const resolvePhoneForSeamless = function(user_id, room_id, cb) {
  async.auto({
    user: cb => {
      getUser(user_id).nodeify(cb)
    },
    room: cb => {
      get(room_id, cb)
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

const others = function (room_id, user_id, cb) {
  get(room_id, function (err, room) {
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

module.exports = {
  getUsers,
  searchForParties,
  searchForUsers,
  getUserRooms,
  getUserRoomIds,
  getUserPeers,
  belongs,
  resolveRoomForSeamless,
  resolvePhoneForSeamless,
  others
}
