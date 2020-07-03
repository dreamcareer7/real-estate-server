const _u = require('underscore')
const async = require('async')

const db = require('../../utils/db.js')
const Emitter = require('../../utils/event_emitter')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const Alert = require('../Alert/get')
const AlertSetting = require('../Alert/setting')
const Notification = require('../Notification/issue')

const {
  get: getUser,
  getAbbreviatedDisplayName
} = require('../User/get')

const {
  combineUserReferences
} = require('../User/references')

const { notificationSettingTypes } = require('./consts')
const { get, getAll } = require('./get')

/**
 * Adds a `user` to a `room`
 * @param {UUID} user_id - ID of the user being added
 * @param {UUID} room_id - ID of the room the user being added to
 */
function add_user (user_id, room_id, notification_setting, relax, cb) {
  const query = relax ? 'room/add_user_relaxed' : 'room/add_user'

  db.query(query, [user_id, room_id, notification_setting || 'N_ALL'], (err, res) => {
    if (err) {
      if (err.code === '23505') {
        return cb(Error.Conflict())
      }

      return cb(err)
    }

    return cb()
  })
}

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

/**
 * Adds a `user` to this `room`
 */
const addUser = function ({inviting_id, user_id, room_id, notification_setting, connect_override, relax}, cb) {
  expect(user_id).to.be.a.uuid
  if (notification_setting) {
    expect(notification_setting).to.be.a('string')
    expect(notificationSettingTypes).to.include(notification_setting)
  }

  async.auto({
    user: cb => {
      getUser(user_id).nodeify(cb)
    },
    inviting_user: cb => {
      if(!inviting_id)
        return cb()

      getUser(inviting_id).nodeify(cb)
    },
    room: cb => {
      get(room_id, cb)
    },
    add_user: [
      'user',
      'room',
      cb => {
        add_user(user_id, room_id, notification_setting, relax, cb)
      }
    ],
    get_alerts: [
      'add_user',
      cb => {
        const paging = {
          type: 'Init_C',
          timestamp: new Date('2000-01-01').getTime(),
          limit: 999999
        }
        Alert.getForRoom(room_id, paging, cb)
      }
    ],
    add_alerts_setting: [
      'get_alerts',
      (cb, results) => {
        const all = []
        results.get_alerts.forEach(alert => {
          all.push(AlertSetting.insert(user_id, alert.id))
        })
        Promise.all(all).then(res => cb(null, res)).catch(e => cb(e))
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

        const invited_name = getAbbreviatedDisplayName(results.user)
        const inviting_name = getAbbreviatedDisplayName(results.inviting_user)

        notification.message = inviting_name + ' invited ' + invited_name + ' to join.'
        notification.action = 'Invited'
        notification.subject = inviting_id
        notification.subject_class = 'User'
        notification.object = room_id
        notification.object_class = 'Room'
        notification.auxiliary_object = user_id
        notification.auxiliary_object_class = 'User'
        notification.room = room_id

        return Notification.issueForRoomExcept(notification, [inviting_id], cb)
      }
    ],
    notification: [
      'user',
      'room',
      (cb, results) => {
        Emitter.emit('Room:user added', {
          user: results.user,
          room: results.room
        })

        return cb()
      }
    ]
  }, cb)
}

/**
 * Removes user from a `room`
 * @param {UUID} room_id - ID of the referenced room
 * @param {UUID} user_id - ID of the referenced user
 */
const removeUser = function (room_id, user_id, cb) {
  get(room_id, (err, room) => {
    if (err)
      return cb(err)

    if (room.room_type === 'Personal' || room.room_type === 'Direct')
      return cb(Error.NotAcceptable('You cannot leave your personal room or a direct message'))

    getUser(user_id).nodeify((err, user) => {
      if (err)
        return cb(err)

      db.query('room/leave', [room_id, user_id], cb)
    })
  })
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

module.exports = {
  getUsers,
  searchForParties,
  searchForUsers,
  removeUser,
  addUser,
  getUserRooms,
  getUserRoomIds,
  getUserPeers,
  belongs,
  resolveRoomForSeamless,
  resolvePhoneForSeamless
}
