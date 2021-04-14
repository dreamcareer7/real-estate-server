const async = require('async')
const _ = require('lodash')

const config = require('../../config.js')

const Job = require('../Job')
const Context = require('../Context')
const SMS = require('../SMS')
const Room = require('../Room/get')
const User = require('../User/get')
const Orm = require('../Orm/index')

const { getAll } = require('./get')

const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')


const {
  resolvePhoneForSeamless
} = require('../Room/users/get')

const {
  isPushOK: isPushToRoomOK
} = require('../Room/notification')

const {
  isPushOK,
  shouldTrySMS
} = require('../User/notification')

const {
  TRANSPORT_NONE,
  TRANSPORT_PUSH,
  TRANSPORT_SMS
} = require('./constants')

const {
  saveDelivery
} = require('./delivery')

const {
  getAppBadgeForUser,
  getDeviceTokensForUser
} = require('./device')

const {
  isSystemGenerated
} = require('./get')

const sendAsPush = function(notification_user, notification, user, room, tokens, delay, cb) {
  async.auto({
    summary: (cb, results) => {
      getAppBadgeForUser(user.id, (err, count) => {
        if(err)
          return cb(err)

        notification.badge_count = count || 0
        return cb()
      })
    },
    send: [
      'summary',
      (cb, results) => {
        async.map(tokens, (token, cb) => {
          saveDelivery(notification.notification_id, user.id, token, 'airship', (err) => {
            if (err)
              return cb(err)

            const job = Job.queue.create('airship_transport_send_device', {
              notification_user,
              notification,
              token: token,
              user_id: user.id
            }).removeOnComplete(true)

            if (delay > 0)
              job.delay(delay)

            Context.get('jobs').push(job)

            return cb()
          })
        }, cb)
      }
    ]
  }, cb)
}

const sendAsText = function(notification_user, notification, user, room, delay, cb) {
  const _saveDelivery = (cb, results) => {
    saveDelivery(notification.id, user.id, user.phone_number, 'sms', cb)
  }

  const send = (cb, results) => {
    if (!results.from) {
      Context.log('NO PHONE NUMBER ASSOCIATED WITH USER:', user.id, 'ON ROOM:', room)
      return cb()
    }

    // We have not yet implemented this correctly
    if (!room)
      return cb()

    const text = {
      to: user.phone_number,
      from: results.from,
      body: notification_user.sms_message
    }

    if (results.photo)
      text.image = results.photo

    SMS.send(text, cb)
  }

  const resolvePhoneNumber = (cb, results) => {
    if (!room)
      return cb(null, config.twilio.from)

    resolvePhoneForSeamless(user.id, room.id, cb)
  }

  const report = (err) => {
    if (!err)
      return cb()

    if (err.http === 501)
      return cb()

    return cb(err)
  }

  const resolvePhoto = (cb, results) => {
    if (notification.notification_type === 'UserSentMessage') {
      const message = notification.objects[0]

      if (!message || !message.attachments || !(message.attachments.length > 0))
        return cb()

      const attachment = message.attachments[0]
      return cb(null, attachment.preview_url)
    }

    if (notification.notification_type === 'UserSharedListing') {
      return cb(null, notification.objects[0].cover_image_url)
    }

    cb()
  }

  async.auto({
    from: resolvePhoneNumber,
    delivery: _saveDelivery,
    photo: resolvePhoto,
    send: ['from', 'delivery', 'photo', send]
  }, report)
}

const send = function ({
  notification,
  user,
  notification_user,
  room
}, cb) {
  const room_id = room ? room.id : null
  const send = (cb, results) => {
    let delay = 0

    if (!isSystemGenerated(notification))
      delay = 0
    else
      delay = (results.user_ok_for_push < 0) ? 0 : results.user_ok_for_push

    if (!results.room_ok_for_push && isSystemGenerated(notification))
      return cb()

    if (results.transport === TRANSPORT_PUSH)
      return sendAsPush(notification_user, notification, user, room, results.tokens, delay, cb)

    else if (results.transport === TRANSPORT_SMS)
      return sendAsText(notification_user, notification, user, room, delay, cb)

    cb()
  }

  const roomOkForPush = (user_id, room_id, cb) => {
    if (!room_id)
      return cb(null, true)

    return isPushToRoomOK(user_id, room_id, cb)
  }

  const transport = (cb, results) => {
    if (!_.isEmpty(results.tokens))
      return cb(null, TRANSPORT_PUSH)

    if (_.isEmpty(results.tokens) && shouldTrySMS(user))
      return cb(null, TRANSPORT_SMS)

    return cb(null, TRANSPORT_NONE)
  }

  async.auto({
    tokens: getDeviceTokensForUser.bind(null, user.id),
    user_ok_for_push: isPushOK.bind(null, user.id),
    room_ok_for_push: (cb, results) => roomOkForPush(user.id, room_id, cb),
    transport: ['tokens', transport],
    send: [
      'tokens',
      'user_ok_for_push',
      'room_ok_for_push',
      'transport',
      send
    ]
  }, cb)
}

const sendForUnread = async () => {
  const res = await db.query.promise('notification/unread', [])

  if (res.rows.length < 1)
    return

  const user_ids = res.rows.map(r => r.user)
  const user_objects = await User.getAll(user_ids)
  const users = _.keyBy(user_objects, 'id')

  const notification_ids = res.rows.map(r => r.notification)
  const notification_objects = await promisify(getAll)(notification_ids)
  const notifications_pop = await Orm.populate({models: notification_objects})
  const notifications = _.keyBy(notifications_pop, 'id')


  const room_ids = notification_objects.map(n => n.room)
  const room_objects = await promisify(Room.getAll)(room_ids)
  const rooms = _.keyBy(room_objects, 'id')


  for(const notification_user of res.rows) {
    const notification = notifications[notification_user.notification]
    const room = rooms[notification.room]
    const user = users[notification_user.user]

    const clone = _.clone(notification)
    clone.notification_id = notification.id
    clone.recommendation = notification.recommendation ? notification.recommendation.id : null

    await promisify(send)({
      notification: clone,
      user,
      room,
      notification_user
    })
  }
}

module.exports = {
  send,
  sendForUnread,
}
