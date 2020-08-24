const db = require('../../../utils/db.js')

const {
  get: getUser
} = require('../../User/get')

const { get } = require('../get')

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

module.exports = {
  removeUser
}
