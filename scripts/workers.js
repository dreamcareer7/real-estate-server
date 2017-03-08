const Domain = require('domain')
require('../lib/models/index.js')()
const db = require('../lib/utils/db')
require('colors')

const config = require('../lib/config.js')
const queue = require('../lib/utils/queue.js')
const async = require('async')

let i = 0

const getDomain = (job, cb) => {
  db.conn(function (err, conn, done) {
    if (err)
      return cb(Error.Database(err))

    const domain = Domain.create()
    domain.i = ++i
    console.log('Started domain', domain.i)

    const rollback = function (err) {
      console.log('<- Rolling back on worker'.red, process.domain.i, job, err)
      conn.query('ROLLBACK', done)
    }

    const commit = cb => {
      conn.query('COMMIT', function () {
        console.log('Commited transaction'.green, process.domain.i, job)
        done()
        Job.handle(domain.jobs, cb)
      })
    }

    conn.query('BEGIN', function (err) {
      if (err)
        return cb(Error.Database(err))

      domain.db = conn
      domain.jobs = []

      domain.run(() => {
        console.log('Entered domain', domain.i, process.domain.i)
        cb(null, {rollback,commit})
      })
    })

    let handled = false
    domain.on('error', function (e) {
      delete e.domain
      delete e.domainThrown
      delete e.domainEmitter
      delete e.domainBound

      console.log('⚠ Panic:'.yellow, domain.i, e, e.stack)
      rollback(e.message)
    })
  })
}

// We have proper error handling here. No need for auto reports.
Error.autoReport = false

const airship = (job, done) => {
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done)
}

const notification = (job, done) => {
  console.log('Notification handler called', process.domain.i)
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

  const handler = (job, done) => {
    console.log('Picking Job', queue_name)

    getDomain(job.data, (err, {rollback, commit}) => {
      console.log('Executing job handler', process.domain.i)
      const examine = err => {
        if (err)
          return rollback(err)

        commit(done)
      }

      definition.handler(job, examine)
    })
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
  getDomain({}, (err, {rollback, commit}) => {
    if (err)
      return rollback(err)

    async.series([
      Notification.sendForUnread,
      Message.sendEmailForUnread,
    ], err => {
      if (err)
        return rollback(err)

      commit(err => {
        if (err)
          console.log('Error committing', err)

        setTimeout(sendNotifications, 5000)
      })
    })
  })
}

sendNotifications()
