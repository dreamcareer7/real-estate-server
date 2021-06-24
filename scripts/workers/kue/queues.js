const config = require('../../../lib/config')

const Notification = require('../../../lib/models/Notification')
const User = require('../../../lib/models/User/last-seen')

const airship = (job, done) => {
  const {
    notification_user,
    notification,
    user_id,
    token,
  } = job.data

  notification.app || (notification.app = 'rechat')

  Notification.sendToDevice(notification_user, notification, token, user_id, done)
}

const notification = (job, done) => {
  Notification.create(job.data.notification, done)
}

const saveLastSeen = (job, done) => {
  User.saveLastSeen(job.data, done)
}

module.exports = {
  airship_transport_send_device: {
    handler: airship,
    parallel: config.push.rechat.config.parallel
  },

  create_notification: {
    handler: notification,
    parallel: 50
  },

  save_last_seen: {
    handler: saveLastSeen,
    parallel: 5
  }
}
