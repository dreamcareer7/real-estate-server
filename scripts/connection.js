const db = require('../lib/utils/db')
const deasync = require('deasync')
require('colors')
require('../lib/models/index.js')()

const context = Context.create()

const getConnection = deasync(db.conn)
const jobs = []
jobs.push = job => Job.handle([job], () => {})

context.set({
  db: getConnection(),
  jobs,
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
