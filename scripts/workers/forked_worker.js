const { peanar } = require('../../lib/utils/peanar')

require('../../lib/models/index.js')()
const Context = require('../../lib/models/Context')

require('../../lib/models/Calendar/worker')
require('../../lib/models/Contact/worker')
require('../../lib/models/Flow/worker')
require('../../lib/models/CRM/Task/worker')
require('../../lib/models/CRM/Touch/worker')
require('../../lib/models/MLS/workers')
// require('../../lib/models/Showings/worker')
require('../../lib/models/Google/workers')
require('../../lib/models/Microsoft/workers')
require('../../lib/models/Deal/email')
require('../../lib/models/Deal/brokerwolf')
require('../../lib/models/Email')
require('../../lib/models/SMS')

const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachFlowEvents = require('../../lib/models/Flow/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')

attachCalendarEvents()
attachContactEvents()
attachFlowEvents()
attachTaskEventHandler()
attachTouchEventHandler()

const context = Context.create({
  id: 'peanar-workers-child'
})

/** @type {NodeJS.Timeout} */
let heartbeat_timer

function sendHeartbeat() {
  if (process.send) {
    process.send({ action: 'HEARTBEAT' })
  } else {
    context.log('Heartbeat!')
  }
}

function startHeatbeater() {
  sendHeartbeat()
  heartbeat_timer = setInterval(sendHeartbeat, 30000)
}

function stopHeartbeater() {
  if (heartbeat_timer) clearInterval(heartbeat_timer)
}

async function shutdown() {
  stopHeartbeater()
  try {
    await peanar.shutdown()
    process.exit()
  }
  catch (ex) {
    context.error(ex)
    process.exit()
  }
}

process.on('SIGTERM', shutdown)

/**
 * @param {string} args 
 */
async function main(args) {
  if (!args) {
    process.exit(1)
  }

  await peanar.broker.connect()

  /** @type {{ queues: string[]; concurrency?: number; }} */
  const { queues, concurrency } = JSON.parse(args)
  console.log({ queues, concurrency })

  try {
    await peanar.worker({ queues, concurrency })
    startHeatbeater()
  } catch (ex) {
    context.error(ex)
    await shutdown()
  }
}

context.run(() => {
  main(process.argv[2]).catch(ex => console.error(ex))
})
