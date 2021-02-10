const kue = require('kue')
const promisify = require('../../../lib/utils/promisify.js')
const queue = require('../../../lib/utils/queue')
const queues = require('./queues')

const Context = require('../../../lib/models/Context')
const Metric = require('../../../lib/models/Metric')
const Slack = require('../../../lib/models/Slack')

const createContext = require('../utils/create-context')

function reportQueueStatistics () {
  // @ts-ignore
  queue.inactiveCount((err, count) => {
    if (err)
      return Metric.set('inactive_jobs', 99999)

    return Metric.set('inactive_jobs', count)
  })
}

let kueCleanupTimeout, statsInterval

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

function start() {
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
  
  statsInterval = setInterval(reportQueueStatistics, 10000)

  reportQueueStatistics()
  cleanupKueJobs()
}

async function shutdown() {
  clearTimeout(kueCleanupTimeout)
  clearInterval(statsInterval)
  clearInterval(queue.stuck_job_watch)

  await promisify(cb => queue.shutdown(5 * 60 * 1000, (err) => {
    if (err) {
      Context.error(err)
      return cb(err)
    }

    Context.log('Kue closed successfully.')
    cb()
  }))()
}

module.exports = {
  start, shutdown
}
