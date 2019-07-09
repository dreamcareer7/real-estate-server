const db = require('../lib/utils/db')
const { peanar } = require('../lib/utils/peanar')
const deasync = require('deasync')
require('colors')
require('../lib/models/index.js')()

peanar.job = (fn, def) => {
  const job_name = (def.name && def.name.length) ? def.name : fn.name

  peanar.log(`Peanar: job('${def.queue}', '${job_name}')`)

  const job_def = peanar._registerJob(fn, def)

  const self = peanar

  function enqueueJob() {
    self.log(`Peanar: job.enqueueJobLater('${job_name}', ${[...arguments]})`)
    return self._enqueueJob(job_def, self._prepareJobRequest(job_name, [...arguments]))
  }

  enqueueJob.rpc = async function() {}

  return enqueueJob
}

const context = Context.create()

const getConnection = deasync(db.conn)
const jobs = []
jobs.push = job => Job.handle([job], () => {})

context.set({
  db: getConnection(),
  jobs,
  rabbit_jobs: []
})
context.enter()

function errorHandler(type) {
  return (e) => {
    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound
  
    console.log(e, e.stack)
    Slack.send({
      channel: '7-server-errors',
      text: type + ': ' + '\n `' + e + '`',
      emoji: ':skull:'
    }, process.exit)
  }
}
process.on('uncaughtException', errorHandler('Uncaught exception'))
process.on('unhandledRejection', errorHandler('Unhandled rejection'))
