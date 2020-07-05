/**
 * @namespace Notification
 */

const async = require('async')
const _u = require('underscore')
const UrbanAirshipPush = require('urban-airship-push')
const EventEmitter = require('events').EventEmitter
const db = require('../../utils/db.js')
const config = require('../../config.js')
const emojify = require('emojify.js')
const Context = require('../Context')
const Room = require('../Room')
const Orm = require('../Orm.js')
const User = require('../User')

const promisify = require('../../utils/promisify')
const _ = require('lodash')

const emitter = new EventEmitter

const Notification = {
  ...require('./issue'),
  ...require('./create'),
  ...require('./constants'),
  ...require('./get'),
  ...require('./branch'),
  ...require('./send'),
  ...require('./delivery'),
  ...require('./device')
}

Notification.on = emitter.on.bind(emitter)

Orm.register('notification', 'Notification', Notification)

Notification.remove = async function(notification_id) {
  return db.query.promise('notification/delete', [notification_id])
}

Notification.getForUser = function (user_id, paging, cb) {
  User.get(user_id).nodeify((err, user) => {
    if (err)
      return cb(err)

    db.query('notification/user', [
      user_id,
      paging.type,
      paging.timestamp,
      paging.limit
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const notification_ids = res.rows.map(r => {
        return r.id
      })

      Notification.getAll(notification_ids, (err, notifications) => {
        if (err)
          return cb(err)

        if (res.rows.length > 0) {
          notifications[0].total = res.rows[0].total
          notifications[0].new = res.rows[0].new
        }

        return cb(null, notifications)
      })
    })
  })
}

Notification.registerForPush = function (user_id, channel_id, cb) {
  if (!channel_id)
    return cb(Error.Validation('Channel ID cannot be null'))

  async.auto({
    user: cb => {
      return User.get(user_id).nodeify(cb)
    },
    register:
      cb => {
        db.query('notification/register_push', [user_id, channel_id], cb)
      }
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.user)
  })
}

Notification.unregisterForPush = function (user_id, channel_id, cb) {
  User.get(user_id).nodeify((err, user) => {
    if (err)
      return cb(err)

    db.query('notification/unregister_push', [user_id, channel_id], (err, res) => {
      if (err)
        return cb(err)

      return cb(null, user)
    })
  })
}

Notification.publicize = function (model) {
  if (model.total) delete model.total
  if (model.exclude) delete model.exclude
  if (model.specific) delete model.specific

  return model
}

const airship = new UrbanAirshipPush(config.airship)

Notification.sendToDevice = function (notification_user, notification, channel_id, user_id, cb) {

  const alert = emojify.replace(notification_user.push_message)

  const pushInfo = {
    audience: {
      ios_channel: channel_id
    },
    notification: {
      ios: {
        alert,
        title: notification.title || '',
        sound: 'default',
        badge: notification.badge_count,
        extra: {
          notification_id: notification.notification_id,
          object_type: notification.object_class,
          recommendation_id: notification.recommendation
        }
      }
    },
    device_types: ['ios']
  }
  
  Context.log('<- (Airship-Transport) Sending payload to', channel_id, ':', pushInfo)

  airship.push.send(pushInfo, (err, data) => {
    if (err) {
      Context.log('<- (Airship-Transport) Error sending push notification to'.red, channel_id, ':', err)
      return cb()
    }

    Context.log('<- (Airship-Transport) Successfully sent a push notification to device'.green, channel_id)

    return cb(null, data)
  })
}



Notification.getUnreadForRoom = function (user_id, room_id, cb) {
  db.query('notification/unread_room', [user_id, room_id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}

Notification.sendForUnread = async () => {
  const res = await db.query.promise('notification/unread', [])

  if (res.rows.length < 1)
    return

  const user_ids = res.rows.map(r => r.user)
  const user_objects = await User.getAll(user_ids)
  const users = _.keyBy(user_objects, 'id')

  const notification_ids = res.rows.map(r => r.notification)
  const notification_objects = await promisify(Notification.getAll)(notification_ids)
  const notifications_pop = await Orm.populate({models: notification_objects})
  const notifications = _.keyBy(notifications_pop, 'id')


  const room_ids = notification_objects.map(n => n.room)
  const room_objects = await promisify(Room.getAll)(room_ids)
  const rooms = _.keyBy(room_objects, 'id')


  for(const notification_user of res.rows) {
    const notification = notifications[notification_user.notification]
    const room = rooms[notification.room]
    const user = users[notification_user.user]

    const clone = _u.clone(notification)
    clone.notification_id = notification.id
    clone.recommendation = notification.recommendation ? notification.recommendation.id : null

    await promisify(Notification.send)({
      notification: clone,
      user,
      room,
      notification_user
    })
  }
}

Notification.associations = {
  recommendations: {
    collection: true,
    model: 'Recommendation',
    ids: (n, cb) => {
      if (n.recommendation)
        return cb(null, [n.recommendation])

      return cb()
    }
  },
  objects: {
    collection: true,
    model: (n, cb) => cb(null, n.object_class),
    ids: (n, cb) => {
      if (n.object_class === 'Room')
        return cb()

      if (n.object)
        return cb(null, [n.object])
      return cb()
    }
  },
  subjects: {
    collection: true,
    model: (n, cb) => cb(null, n.subject_class),
    ids: (n, cb) => {
      if (n.subject_class === 'Room' || n.subject_class === 'Message')
        return cb()

      if (n.subject)
        return cb(null, [n.subject])

      return cb()
    }
  },
  auxiliary_object: {
    optional: true,
    model: (n, cb) => cb(null, n.auxiliary_object_class),
    id: (n, cb) => {
      if (n.auxiliary_object_class === 'Room' || n.auxiliary_object_class === 'Message')
        return cb()

      return cb(null, n.auxiliary_object)
    }
  },
  auxiliary_subject: {
    optional: true,
    model: (n, cb) => cb(null, n.auxiliary_subject_class),
    id: (n, cb) => {
      if (n.auxiliary_subject_class === 'Room' || n.auxiliary_subject_class === 'Message')
        return cb()

      return cb(null, n.auxiliary_subject)
    }
  }
}

module.exports = Notification
