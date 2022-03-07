const _ = require('lodash')
require('colors')

const redisDataService = require('../../lib/data-service/redis')

const db = require('../../lib/utils/db')

const Slack = require('../../lib/models/Slack')

const Context = require('../../lib/models/Context')
const attachModelEventHandlers = require('../../lib/models/Context/events')

const Blocked = require('blocked-at')
const moduleControls = {
  /** @type {Array<() => Promise<void>>} */
  starts: [],

  /** @type {Array<() => Promise<void>>} */
  shutdowns: [],
}

const blocked = (time, stack, { type, resource }) => {
  Context.log(`Blocked for ${time}ms:`, type, resource, stack)
}

function attachProcessEventHandlers() {
  process.on('unhandledRejection', (err, promise) => {
    Context.trace('Unhanled Rejection on request', err)
    Slack.send({
      channel: '7-server-errors',
      text: `Workers: Unhandled rejection: \`${err}\``,
      emoji: ':skull:',
    })
  })

  process.on('uncaughtException', (err) => {
    Context.trace('Uncaught Exception:', err)
    Slack.send({
      channel: '7-server-errors',
      text: `Workers: Uncaught exception: \`${err}\``,
      emoji: ':skull:',
    })
  })

  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

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

async function shutdownModules() {
  await Promise.all(moduleControls.shutdowns.map(shutdown => shutdown()))
  await db.close()
}

async function shutdown() {
  Context.log('Shutting down')
  try {
    await Promise.race([timeout(5.2 * 60 * 1000), shutdownModules()])

    Context.log('Race finished.')

    clearTimeout(shutdownRaceTimeout)
    redisDataService.shutdown()
    process.exit()
  } catch (ex) {
    Context.log('Race timed out!')
    Context.error(ex)
    process.exit(1)
  }
}

async function start() {
  await Promise.all(moduleControls.starts.map(start => start()))
}

/**
 * @param {string[]} modules
 */
function registerModules(modules) {
  const [starts, shutdowns] = _.zip(...modules.map((module_path) => Object.values(require(module_path))))

  moduleControls.starts = starts
  moduleControls.shutdowns = shutdowns
}

async function main() {
  attachProcessEventHandlers()
  Blocked(blocked, { threshold: 2000 })

  attachModelEventHandlers()

  if (process.argv.length > 2) {
    registerModules(process.argv.slice(2))
  } else {
    registerModules(['./peanar/all', './pollers/all'])
  }

  await start()
}

main().catch((ex) => {
  console.error(ex)
  process.exit(1)
})
