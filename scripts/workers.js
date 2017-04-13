require('../lib/models/index.js')()
require('colors')

const Domain = require('domain')
const db = require('../lib/utils/db')
const debug = require('debug')('rechat:workers')

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
    debug('Started domain', domain.i, job)

    const rollback = function (err) {
      console.log('<- Rolling back on worker'.red, domain.i, job, err)
      conn.query('ROLLBACK', done)
    }

    const commit = cb => {
      conn.query('COMMIT', function () {
        debug('Commited transaction'.green, domain.i, job)
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
        debug('Entered domain', domain.i, process.domain.i)
        cb(null, {rollback,commit})
      })
    })

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
    parallel: 1
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
    debug('Picking Job', queue_name)

    // eslint-disable-next-line
    getDomain(job.data, (err, {rollback, commit}) => {
      if (err) {
        console.log('Error getting domain', err)
        done(err)
        return
      }

      debug('Executing job handler', process.domain.i)
      const examine = err => {
        if (err) {
          rollback(err)
          done(err)
          return
        }

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
