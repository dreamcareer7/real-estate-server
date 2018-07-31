require('colors')
const kue = require('kue')
const Domain = require('domain')
const async = require('async')
const debug = require('debug')('rechat:workers')

const db = require('../lib/utils/db')
const promisify = require('../lib/utils/promisify.js')

const queue = require('../lib/utils/queue.js')

const Job = require('../lib/models/Job')
const Metric = require('../lib/models/Metric')
const Slack = require('../lib/models/Slack')

const Notification = require('../lib/models/Notification')
const CrmTaskWorker = require('../lib/models/CRM/Task/worker')
const attachContactEvents = require('../lib/models/Contact/events')
const attachTouchEventHandler = require('../lib/models/CRM/Touch/events')

attachContactEvents()
attachTouchEventHandler()

let i = 0

process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
})

const getDomain = (job, cb) => {
  db.conn(function (err, conn, done) {
    if (err)
      return cb(Error.Database(err))

    const domain = Domain.create()
    domain.id = ++i

    const rollback = function (err) {
      Context.trace('<- Rolling back on worker'.red, job, err)

      Slack.send({
        channel: '7-server-errors',
        text: 'Worker Error: ' + '\n `' + err + '`',
        emoji: ':skull:'
      })

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

      Context.log('⚠ Panic:'.yellow, e, e.stack)
      rollback(e.message)
    })
  })
}

// We have proper error handling here. No need for auto reports.
Error.autoReport = false

const queues = require('./queues')

Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const handler = (job, done) => {
    debug('Picking Job', queue_name)

    // eslint-disable-next-line
    getDomain(job.data, (err, {rollback, commit} = {}) => {
      if (err) {
        Context.log('Error getting domain', err)
        done(err)
        return
      }

      const examine = (err, result) => {
        if (err) {
          rollback(err)
          done(err)
          return
        }

        Metric.increment(`Job.${queue_name}`)
        commit(done.bind(null, null, result))
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

const shutdown = () => {
  queue.shutdown(5000, process.exit)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

setTimeout(shutdown, 1000 * 60 * 10) // Restart every 3 minutes

function nodeifyFn(fn) {
  return (cb) => fn().nodeify(cb)
}

const sendNotifications = function () {
  getDomain({}, (err, {rollback, commit} = {}) => {
    if (err) {
      if (typeof rollback === 'function')
        rollback(err)

      return
    }

    async.series([
      nodeifyFn(Notification.sendForUnread),
      Message.sendEmailForUnread,
      nodeifyFn(CrmTaskWorker.sendNotifications),
      nodeifyFn(Task.sendNotifications),
    ], err => {
      if (err)
        return rollback(err)

      commit(err => {
        if (err)
          Context.log('Error committing', err)

        setTimeout(sendNotifications, 5000)
      })
    })
  })
}

sendNotifications()

async function cleanupKueJobs() {
  const jobs = (await promisify(kue.Job.rangeByState)('complete', 0, 10000, 'asc'))
    .filter(job => parseInt(job.toJSON().started_at) <= Date.now() - 60 * 60 * 1000)

  if (jobs.length > 0)
    console.log('-> (Jobs) Cleaning up ' + jobs.length + ' completed jobs.')

  for (const job of jobs) {
    await promisify(job.remove.bind(job))()
  }

  setTimeout(cleanupKueJobs, 1 * 60 * 1000)
}

cleanupKueJobs()
