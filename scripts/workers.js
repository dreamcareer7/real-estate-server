require('./connection.js')
require('colors')

const config = require('../lib/config.js')
const queue = require('../lib/utils/queue.js')
const async = require('async')

// We have proper error handling here. No need for auto reports.
Error.autoReport = false

const airship = (job, done) => {
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done)
}

const notification = (job, done) => {
  Notification.create(job.data.notification, done)
}

const email = (job, done) => {
  Mailgun.callMailgun(job.data, done)
}

const email_sane = (job, done) => {
  Email.sendSane(job.data, done)
}

const ses = (job, done) => {
  SES.callSES(job.data, done)
}

const sms = (job, done) => {
  Twilio.callTwilio(job.data, done)
}

const queues = {
  airship_transport_send_device: {
    handler: airship,
    parallel: config.airship.parallel
  },

  create_notification: {
    handler: notification,
    parallel: config.airship.parallel
  },

  email: {
    handler: email,
    parallel: config.email.parallel
  },

  email_sane: {
    handler: email_sane,
    parallel: config.email.parallel
  },

  email_ses: {
    handler: ses,
    parallel: config.email.parallel
  },

  sms: {
    handler: sms,
    parallel: config.twilio.parallel
  }
}

Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const reportError = err => {
    console.log('Error processing job: ', queue_name, ':', err)
    const text = '🗑 Worker Error: ' + queue_name + ' \n :memo: `' + JSON.stringify(err) + '`'

    Slack.send({
      channel: 'server-errors',
      text: text,
      emoji: '💀'
    })
  }

  const handler = (job, done) => {
    const examine = err => {
      if (err)
        reportError(err)

      done(err)
    }

    definition.handler(job, examine)
  }

  queue.process(queue_name, definition.parallel, handler)
})

setInterval(reportQueueStatistics, 10000)

function reportQueueStatistics () {
  queue.inactiveCount((err, count) => {
    if (err)
      return Metric.set('inactive_jobs', 99999)

    return Metric.set('inactive_jobs', count)
  })
}

reportQueueStatistics()

const sendNotifications = function () {
  async.series([
    Notification.sendForUnread,
    Message.sendEmailForUnread,
  ], err => {
    if (err) {
      console.log(err)

      const text = '🔔 Error while sending notifications: \n :memo: `' + JSON.stringify(err) + '` \n --- \n'

      Slack.send({
        channel: 'server-errors',
        text: text,
        emoji: '💀'
      })
    }

    setTimeout(sendNotifications, 1000)
  })
}

sendNotifications()
