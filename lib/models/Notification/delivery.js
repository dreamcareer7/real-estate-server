const db = require('../../utils/db.js')
const Socket = require('../Socket')
const Room = require('../Room')
const Orm = require('../Orm.js')
const User = require('../User')
const async = require('async')

const {
  get
} = require('./get')



const saveDelivery = function(nid, u, token, type, cb) {
  get(nid, (err, n) => {
    if(err)
      return cb(err)

    db.query('notification/insert_delivery', [n.id, u, token, type], err => {
      if(err)
        return cb(err)

      if(!n.room)
        return cb()

      Orm.populate({
        models: [n]
      }).nodeify((err, populated) => {
        if (err)
          return cb(err)

        Socket.send('Notification.Delivered', n.room, [{
          notification: populated[0],
          user: u,
          delivery_type: type
        }])

        cb()
      })
    })
  })
}

const ackRoom = function (user_id, room_id, cb) {
  async.auto({
    user: cb => {
      User.get(user_id).nodeify(cb)
    },
    room: cb => {
      Room.get(room_id, cb)
    },
    ack: [
      'user',
      'room',
      cb => {
        db.query('notification/ack_room', [user_id, room_id], cb)
      }
    ],
    socket: [
      'ack',
      cb => {
        Socket.send('Room.Acknowledged', room_id, [{
          room: room_id,
          user: user_id
        }])

        cb()
      }
    ]
  }, cb)
}

const ackPersonal = function (user_id, notifications, cb) {
  async.auto({
    user: cb => {
      User.get(user_id).nodeify(cb)
    },
    ack: [
      'user',
      cb => {
        db.query('notification/ack_personal', [user_id, notifications], cb)
      }
    ]
    // FIXME: probably needs a socket event
    // socket: [
    //   'ack',
    //   cb => {
    //     Socket.send('Room.Acknowledged', room_id, [{
    //       room: room_id,
    //       user: user_id
    //     }])
    //   }
    // ]
  }, cb)
}

const ackSingle = (user_id, notification_id) => {
  return db.query.promise('notification/ack_single', [user_id, notification_id])
}

const patchSeen = function (user_id, notificationIDs, cb) {
  async.auto({
    user: cb => {
      User.get(user_id).nodeify(cb)
    },
    seen: [
      'user',
      cb => {
        notificationIDs = (notificationIDs && [notificationIDs]) || null
        db.query('notification/patch_seen', [user_id, notificationIDs], cb)
      }
    ]
  }, cb)
}

module.exports = {
  patchSeen,
  ackSingle,
  ackPersonal,
  ackRoom,
  saveDelivery
}
