const _u = require('underscore')
const EventEmitter = require('events').EventEmitter
const db = require('../../utils/db.js')
const Room = require('../Room/get')
const Orm = require('../Orm.js')
const User = require('../User/get')

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

Notification.publicize = function (model) {
  if (model.total) delete model.total
  if (model.exclude) delete model.exclude
  if (model.specific) delete model.specific

  return model
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
