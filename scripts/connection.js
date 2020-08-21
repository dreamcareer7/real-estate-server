const db = require('../lib/utils/db')
const Slack = require('../lib/models/Slack')

const { peanar } = require('../lib/utils/peanar')
const Peanar = require('peanar')

const deasync = require('deasync')
require('colors')
const Job = require('../lib/models/Job')
const Context = require('../lib/models/Context')

// @ts-ignore
peanar._createEnqueuer = Peanar.prototype._createEnqueuer

const context = Context.create()

const getConnection = deasync(db.conn)
const jobs = []
jobs.push = job => { Job.handle([job], () => {}); return 1 }

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
