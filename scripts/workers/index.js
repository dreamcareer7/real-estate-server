require('colors')
const kue = require('kue')
const promisify = require('../../lib/utils/promisify.js')

const redisDataService = require('../../lib/data-service/redis')

const { peanar } = require('../../lib/utils/peanar')
const db = require('../../lib/utils/db')
const queue = require('../../lib/utils/queue')
const queues = require('./queues')

const Metric = require('../../lib/models/Metric')
const Slack = require('../../lib/models/Slack')

const Context = require('../../lib/models/Context')
const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachFlowEvents = require('../../lib/models/Flow/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')
const attachCalIntEventHandler = require('../../lib/models/CalendarIntegration/events')
const attachContactIntEventHandler = require('../../lib/models/ContactIntegration/events')

const createContext = require('./create-context')

const shutdownPeanarWorkers = require('./peanar')

const Blocked = require('blocked-at')

const blocked = (time, stack, {type, resource}) => {
  Context.log(`Blocked for ${time}ms:`, type, resource, stack)
}

Blocked(blocked, {
  threshold: 2000
})

attachCalendarEvents()
attachContactEvents()
attachFlowEvents()
attachTaskEventHandler()
attachTouchEventHandler()
attachCalIntEventHandler()
attachContactIntEventHandler()

process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
  Slack.send({
    channel: '7-server-errors',
    text: `Workers: Unhandled rejection: \`${err}\``,
    emoji: ':skull:'
  })
})

process.on('uncaughtException', (err) => {
  Context.trace('Uncaught Exception:', err)
  Slack.send({
    channel: '7-server-errors',
    text: `Workers: Uncaught exception: \`${err}\``,
    emoji: ':skull:'
  })
})

// We have proper error handling here. No need for auto reports.
Error.autoReport = false


Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const handler = async (job, done) => {
    const id = `process-${process.pid}-job-${queue_name}-${job.id}`

    const { run, commit, rollback } = await createContext({
      id
    })

    try {
      const result = await run(async () => {
        try {
          const result = await promisify(definition.handler)(job)
          Metric.increment(`Job.${queue_name}`)
          await commit()
          return result
        } catch(err) {
          await rollback(err)
          throw err
        }
      })
      done(null, result)
    } catch(e) {
      done(e)
    }
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

const statsInterval = setInterval(reportQueueStatistics, 10000)

function reportQueueStatistics () {
  // @ts-ignore
  queue.inactiveCount((err, count) => {
    if (err)
      return Metric.set('inactive_jobs', 99999)

    return Metric.set('inactive_jobs', count)
  })
}

reportQueueStatistics()

let shutdownRaceTimeout
const timeout = (seconds) => {
  return new Promise((_, rej) => {
    shutdownRaceTimeout = setTimeout(() => {
      rej(new Error('Shutdown timed out!'))
    }, seconds * 1000)
  })
}

async function shutdownWorkers() {
  await peanar.shutdown()
  await shutdownPeanarWorkers()
  await promisify(cb => queue.shutdown(5 * 60 * 1000, (err) => {
    if (err) {
      Context.error(err)
      return cb(err)
    }

    Context.log('Kue closed successfully.')
    cb()
  }))()
  await db.close()
}

const shutdown = async () => {
  Context.log('Shutting down')
  try {
    clearTimeout(kueCleanupTimeout)
    // clearTimeout(shutdownTimeout)
    clearInterval(statsInterval)
    clearInterval(queue.stuck_job_watch)

    await Promise.race([
      timeout(5.2 * 60 * 1000),
      shutdownWorkers()
    ])

    Context.log('Race finished.')

    clearTimeout(shutdownRaceTimeout)
    redisDataService.shutdown()
    process.exit()
  }
  catch (ex) {
    Context.log('Race timed out!')
    Context.error(ex)
    process.exit(1)
  }
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

// const shutdownTimeout = setTimeout(shutdown, 1000 * 60 * 10) // Restart every few minutes

let kueCleanupTimeout
async function cleanupKueJobs() {
  const jobs = (await promisify(kue.Job.rangeByState)('complete', 0, 10000, 'asc'))
    .filter(job => parseInt(job.toJSON().started_at) <= Date.now() - 60 * 60 * 1000)

  if (jobs.length > 0)
    console.log('-> (Jobs) Cleaning up ' + jobs.length + ' completed jobs.')

  for (const job of jobs) {
    await promisify(job.remove.bind(job))()
  }

  kueCleanupTimeout = setTimeout(cleanupKueJobs, 1 * 60 * 1000)
}

cleanupKueJobs()
