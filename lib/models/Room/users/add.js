const async = require('async')
const db = require('../../../utils/db')
const Emitter = require('../../../utils/event_emitter')
const validator = require('../../../utils/validator.js')
const expect = validator.expect

const Alert = require('../../Alert/get')
const AlertSetting = require('../../Alert/setting')
const Notification = require('../../Notification/issue')

const {
  get: getUser,
  getAbbreviatedDisplayName
} = require('../../User/get')

const { notificationSettingTypes } = require('../consts')

const { get } = require('../get')

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

module.exports = {
  addUser
}
