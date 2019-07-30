require('../../lib/models/index.js')()

const config = require('../../lib/config')

const Email = require('../../lib/models/Email')
const Notification = require('../../lib/models/Notification')
const User = require('../../lib/models/User')


const airship = (job, done) => {
  const {
    notification_user,
    notification,
    user_id,
    token
  } = job.data

  Notification.sendToDevice(notification_user, notification, token, user_id, done)
}

const notification = (job, done) => {
  Notification.create(job.data.notification, done)
}

const email = (job, done) => {
  Email.send(job.data).nodeify(done)
}

const sms = (job, done) => {
  SMS.callTwilio(job.data, done)
}

const saveLastSeen = (job, done) => {
  User.saveLastSeen(job.data, done)
}

const sync_brokerwolf = (job, done) => {
  Deal.get(job.data.id, (err, deal) => {
    if (err)
      return done(err)

    Deal.BrokerWolf.sync(deal).nodeify(done)
  })
}


module.exports = {
  airship_transport_send_device: {
    handler: airship,
    parallel: config.airship.parallel
  },

  create_notification: {
    handler: notification,
    parallel: 50
  },

  email: {
    handler: email,
    parallel: 50
  },

  sms: {
    handler: sms,
    parallel: config.twilio.parallel
  },

  save_last_seen: {
    handler: saveLastSeen,
    parallel: 5
  },

  'sync_brokerwolf': {
    handler: sync_brokerwolf,
    parallel: 1
  }
}
