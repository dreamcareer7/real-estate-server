require('colors')
const kue = require('kue')
const async = require('async')

const db = require('../lib/utils/db')
const promisify = require('../lib/utils/promisify.js')

const queue = require('../lib/utils/queue.js')

const Job = require('../lib/models/Job')
const Metric = require('../lib/models/Metric')
const Slack = require('../lib/models/Slack')

const Context = require('../lib/models/Context')
const Notification = require('../lib/models/Notification')
const CrmTaskWorker = require('../lib/models/CRM/Task/worker')
const attachContactEvents = require('../lib/models/Contact/events')
const attachTouchEventHandler = require('../lib/models/CRM/Touch/events')

attachContactEvents()
attachTouchEventHandler()

process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
})

const prepareContext = (c, cb) => {
  const context = Context.create({
    ...c
  })

  context.enter()

  db.conn(function (err, conn, done) {
    if (err)
      return cb(Error.Database(err))

    const rollback = function (err) {
      Context.trace('<- Rolling back on worker'.red, err)

      conn.query('ROLLBACK', done)
    }

    const commit = cb => {
      conn.query('COMMIT', function (err) {
        if (err) {
          Context.trace('<- Commit failed!'.red)
          return rollback(err)
        }

        Context.log('Committed 👌')

        done()
        const jobs = context.get('jobs')
        Job.handle(jobs, cb)
      })
    }

    conn.query('BEGIN', function (err) {
      if (err)
        return cb(Error.Database(err))

      context.set({
        db: conn,
        jobs: []
      })

      context.run(() => {
        cb(null, {rollback,commit})
      })
    })

    context.on('error', function (e) {
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
    // eslint-disable-next-line
    const id = `job-${queue_name}-${job.data.type ? (job.data.type + '-') : ''}${job.id}`
    prepareContext({ id }, (err, {rollback, commit} = {}) => {
      if (err) {
        Context.log('Error preparing context', err)
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

queue.on('job failed', (id, err) => {
  Slack.send({
    channel: '7-server-errors',
    text: `Job Error (${id}): \`${err}\``,
    emoji: ':skull:'
  })
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
  prepareContext({
    id: 'worker-notifications'
  }, (err, {rollback, commit} = {}) => {
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
