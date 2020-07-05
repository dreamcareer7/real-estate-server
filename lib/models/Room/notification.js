const async = require('async')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const {
  notificationSettingTypes
} = require('./consts')

const {
  get
} = require('./get')

const {
  get: getUser
} = require('../User/get')

const setNotificationSettings = function (user_id, room_id, setting, cb) {
  expect(notificationSettingTypes).to.include(setting)

  async.auto({
    user: (cb, results) => {
      getUser(user_id).nodeify(cb)
    },
    room: (cb, results) => {
      get(room_id, cb)
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
        get(room_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.final)
  })
}

const isPushOK = function (user_id, room_id, cb) {
  db.query('room/ok_push', [user_id, room_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, true)

    return cb(null, res.rows[0].ok)
  })
}

module.exports = {
  setNotificationSettings,
  isPushOK
}
