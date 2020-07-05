const ObjectUtil = require('../ObjectUtil')

const db = require('../../utils/db.js')

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

module.exports = {
  get,
  getAll,
  getType,
  isSystemGenerated
}
