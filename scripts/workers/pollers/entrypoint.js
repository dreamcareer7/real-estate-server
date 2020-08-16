const wtfnode = require('wtfnode')

const queue = require('../../../lib/utils/queue')
const promisify = require('../../../lib/utils/promisify')
const { peanar } = require('../../../lib/utils/peanar')
const db = require('../../../lib/utils/db')
const redisDataService = require('../../../lib/data-service/redis')

const Context = require('../../../lib/models/Context')
const Slack = require('../../../lib/models/Slack')
const { shutdown: shutdownPollers } = require('../poll')

function reportErrorsToSlack(type) {
  return err => {
    Context.trace(`${type} on request`, err)
    Slack.send({
      channel: '7-server-errors',
      text: `Pollers: ${type}: \`${err}\``,
      emoji: ':skull:'
    })
  }
}

async function shutdown() {
  await shutdownPollers()
  await peanar.shutdown()

  clearInterval(queue.stuck_job_watch)
  await promisify(cb => queue.shutdown(5 * 60 * 1000, (err) => {
    if (err) {
      Context.error(err)
      return cb(err)
    }

    Context.log('Kue closed successfully.')
    cb()
  }))()

  redisDataService.shutdown()
  await db.close()

  wtfnode.dump()
}

async function main() {
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
  process.on('unhandledRejection', reportErrorsToSlack('Unhanled Rejection'))
  process.on('uncaughtException', reportErrorsToSlack('Uncaught Exception'))

  await peanar.declareAmqResources()
}

main().catch(ex => {
  console.error(ex)
})
