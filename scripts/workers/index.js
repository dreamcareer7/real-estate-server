require('colors')
const kue = require('kue')
const promisify = require('../../lib/utils/promisify.js')

const { peanar } = require('../../lib/utils/peanar')
const queue = require('../../lib/utils/queue')
const queues = require('./queues')

const Metric = require('../../lib/models/Metric')
const Slack = require('../../lib/models/Slack')

const Context = require('../../lib/models/Context')
const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')

const createContext = require('./create-context')



require('./poll')
require('./peanar')

attachCalendarEvents()
attachContactEvents()
attachTaskEventHandler()
attachTouchEventHandler()



process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
})

process.on('uncaughtException', (err) => {
  Context.trace('Uncaught Exception:', err)
})

// We have proper error handling here. No need for auto reports.
Error.autoReport = false


Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const handler = async (job, done) => {
    const id = `job-${queue_name}-${job.id}`

    const { rollback, commit } = await createContext({
      id
    })

    try {
      const result = await promisify(definition.handler)(job)
      Metric.increment(`Job.${queue_name}`)
      await commit()
      done(null, result)
    } catch(err) {
      await rollback(err)
      done(err)
      return
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

setInterval(reportQueueStatistics, 10000)

function reportQueueStatistics () {
  queue.inactiveCount((err, count) => {
    if (err)
      return Metric.set('inactive_jobs', 99999)

    return Metric.set('inactive_jobs', count)
  })
}

reportQueueStatistics()

let timeout_timer
const timeout = (seconds) => {
  return new Promise(res => {
    timeout_timer = setTimeout(res, seconds * 1000)
  })
}

const shutdown = async () => {
  await Promise.race([
    timeout(5.2 * 60 * 1000),
    Promise.all([
      peanar.shutdown(),
      promisify(queue.shutdown).call(queue, 5 * 60 * 1000)
    ])
  ])

  clearTimeout(timeout_timer)
}
process.once('SIGTERM', shutdown)
process.once('SIGINT', shutdown)

setTimeout(shutdown, 1000 * 60 * 10) // Restart every few minutes

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
