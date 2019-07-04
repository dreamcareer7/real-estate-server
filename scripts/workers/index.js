require('colors')
const kue = require('kue')
const promisify = require('../../lib/utils/promisify.js')

const queue = require('../../lib/utils/queue.js')

const Metric = require('../../lib/models/Metric')
const Slack = require('../../lib/models/Slack')

require('../../lib/models/index.js')()

const Context = require('../../lib/models/Context')
const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')

const createContext = require('./create-context')

attachCalendarEvents()
attachContactEvents()
attachTaskEventHandler()
attachTouchEventHandler()

require('./poll')

process.on('unhandledRejection', (err, promise) => {
  Context.trace('Unhanled Rejection on request', err)
})

// We have proper error handling here. No need for auto reports.
Error.autoReport = false

const queues = require('./queues')

Object.keys(queues).forEach(queue_name => {
  const definition = queues[queue_name]

  const handler = async (job, done) => {
    const id = `job-${queue_name}-${job.id}`

    const { rollback, commit } = await createContext({
      id
    })

    try {
      const result = await definition.handler(job)
      Metric.increment(`Job.${queue_name}`)
      await commit()
      done(result)
    } catch(err) {
      await rollback(err)
      done()
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

const shutdown = () => {
  queue.shutdown(5 * 60 * 1000, process.exit)
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
