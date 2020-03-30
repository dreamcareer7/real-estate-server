const path = require('path')
// const { dump } = require('wtfnode')

const { peanar } = require('../../lib/utils/peanar')
const { fork } = require('../../lib/utils/fork')

require('../../lib/models/index.js')()
const Context = require('../../lib/models/Context')
const config = require('../../lib/config')

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

/** @type {(() => Promise<void>)[]} */
let shutdowns = []

const context = Context.create({
  id: 'peanar-workers-main'
})

const queues = [
  {
    queues: ['brokerwolf'],
    concurrency: 1
  },
  {
    queues: ['deal_email'],
    concurrency: 5
  },
  {
    queues: ['calendar', 'touches'],
    concurrency: 2
  },
  {
    queues: ['flows', 'contacts', 'contact_lists', 'contact_duplicates', 'crm_tasks'],
    concurrency: 10
  },
  {
    queues: ['contact_import'],
    concurrency: 15
  },
  {
    queues: ['MLS.Office', 'MLS.Room', 'MLS.Agent'],
    concurrency: 50
  },
  {
    queues: ['email_high', 'email_event'],
    concurrency: 20
  },
  {
    queues: ['MLS.OpenHouse', 'MLS.Unit'],
    concurrency: 20
  },
  {
    queues: ['sms'],
    concurrency: config.twilio.parallel
  },
  {
    queues: ['microsoft_notifications'],
    concurrency: 1
  },
  {
    queues: ['gmail_webhooks'],
    concurrency: 1
  }
]

const forks = [
  {
    queues: ['google', 'google_cal'],
    concurrency: 5
  },
  {
    queues: ['microsoft'],
    concurrency: 5
  },
  {
    queues: ['email'],
    concurrency: 20
  },
  {
    queues: ['MLS.Photo', 'MLS.Listing', 'MLS.Listing.Photos.Validate'],
    concurrency: 50
  }
]

/**
 * @template T
 * @param {Promise<T>[]} arr 
 */
async function series(arr) {
  const res = []

  for (const x of arr) {
    res.push(await x)
  }

  return res
}

async function startPeanar() {
  try {
    await peanar.declareAmqResources()
  } catch (ex) {
    console.error(ex)
  }

  for (const q of queues) {
    await peanar.worker(q)
  }

  shutdowns = await series(forks.map(q => fork(path.resolve(__dirname, './forked_worker'), q)))
}

function shutdownForks() {
  return Promise.all(shutdowns.map(s => s()))
}

// process.on('SIGINT', () => {
//   Promise.all([
//     shutdown(),
//     peanar.shutdown()
//   ]).then(() => {
//     dump()
//     process.exit()
//   })
// })

context.run(() => {
  startPeanar().catch(ex => context.error(ex))
})

module.exports = shutdownForks
