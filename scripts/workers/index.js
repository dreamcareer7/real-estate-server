require('colors')

const redisDataService = require('../../lib/data-service/redis')

const db = require('../../lib/utils/db')

const Slack = require('../../lib/models/Slack')

const Context = require('../../lib/models/Context')
const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachFlowEvents = require('../../lib/models/Flow/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')
const attachCalIntEventHandler = require('../../lib/models/CalendarIntegration/events')
const attachContactIntEventHandler = require('../../lib/models/ContactIntegration/events')

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

let shutdownRaceTimeout
const timeout = (seconds) => {
  return new Promise((_, rej) => {
    shutdownRaceTimeout = setTimeout(() => {
      rej(new Error('Shutdown timed out!'))
    }, seconds * 1000)
  })
}

async function shutdownWorkers() {
  await db.close()
}

const shutdown = async () => {
  Context.log('Shutting down')
  try {
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
