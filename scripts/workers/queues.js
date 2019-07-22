require('../../lib/models/index.js')()

const { aggregate } = require('../../lib/utils/worker')

const config = require('../../lib/config')

const touches_handler = require('../../lib/models/CRM/Touch/worker')
const tasks_handler = require('../../lib/models/CRM/Task/worker')
const calendar_handlers = require('../../lib/models/Calendar/worker')

const Email = require('../../lib/models/Email')
const Notification = require('../../lib/models/Notification')
const User = require('../../lib/models/User')
const ShowingsCrawler = require('../../lib/models/Showings/crawler')
const GoogleWorkers = require('../../lib/models/Google/workers/')
const MicrosoftWorkers = require('../../lib/models/Microsoft/workers/')


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

const deal_email = (job, done) => {
  Deal.Email.accept(job.data.incoming).nodeify(done)
}

const showings_crawler = (job, done) => {
  ShowingsCrawler.startCrawler(job.data).nodeify(done)
}

const google_sync = (job, done) => {
  GoogleWorkers.syncGoogle(job.data).nodeify(done)
}

const microsoft_sync = (job, done) => {
  MicrosoftWorkers.syncMicrosoft(job.data).nodeify(done)
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
  },

  'deal_email': {
    handler: deal_email,
    parallel: 5
  },

  touches: {
    handler: touches_handler,
    parallel: 8
  },

  tasks: {
    handler: tasks_handler,
    parallel: 8
  },

  calendar: {
    handler: aggregate(calendar_handlers),
    parallel: 2
  },

  showings_crawler: {
    handler: showings_crawler,
    parallel: 1
  },

  google_sync: {
    handler: google_sync,
    parallel: 1
  },

  microsoft_sync: {
    handler: microsoft_sync,
    parallel: 1
  }
}
