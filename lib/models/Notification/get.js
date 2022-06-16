const ObjectUtil = require('../ObjectUtil')

const db = require('../../utils/db.js')

const {
  get: getUser
} = require('../User/get')

const getType = n => n.subject_class + n.action + n.object_class

const get = function (id, cb) {
  getAll([id], (err, notifications) => {
    if(err)
      return cb(err)

    if (notifications.length < 1)
      return cb(Error.ResourceNotFound(`Notification ${id} not found`))

    const notification = notifications[0]

    return cb(null, notification)
  })
}

const getAll = function(notification_ids, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('notification/get', [notification_ids, user_id], (err, res) => {
    if (err)
      return cb(err)

    const notifications = res.rows

    return cb(null, notifications)
  })
}

const isSystemGenerated = function (notification) {
  if (notification.action === 'BecameAvailable' ||
      notification.action === 'PriceDropped' ||
      notification.action === 'Available' ||
      notification.action === 'StatusChanged')
    return true

  return false
}

const getUnreadForRoom = function (user_id, room_id, cb) {
  db.query('notification/unread_room', [user_id, room_id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}

const getForUser = function (user_id, paging, cb) {
  getUser(user_id).nodeify((err, user) => {
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

      getAll(notification_ids, (err, notifications) => {
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

/**
 * Finds non-delivered notifications (according to #transport)
 * @typedef {string} PostgresInterval
 * @typedef {INotification & { user: string }} NotificationWithUser
 *
 * @param {object} opts
 * @param {TNotificationDeliveryType} opts.transport - transport
 * @param {TNotificationObjectClass | null} [opts.objectClass] - object class
 * @param {PostgresInterval | null} [opts.maxAge] - maximum notification age
 *
 * @returns {Promise<NotificationWithUser[]>}
 */
async function getNonDelivered ({
  transport,
  objectClass = null,
  maxAge =  '2 hours',
}) {
  return db.select('notification/non_delivered', [
    transport,
    objectClass,
    maxAge,
  ])
}

module.exports = {
  get,
  getAll,
  getType,
  getForUser,
  getUnreadForRoom,
  isSystemGenerated,
  getNonDelivered,
}
