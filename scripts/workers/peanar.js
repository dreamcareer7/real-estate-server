const path = require('path')
// const { dump } = require('wtfnode')

const { peanar } = require('../../lib/utils/peanar')
const { fork } = require('../../lib/utils/fork')

const config = require('../../lib/config')

require('../../lib/models/Calendar/worker')
require('../../lib/models/Contact/worker')
require('../../lib/models/Flow/worker')
require('../../lib/models/Showing/showing/worker')
require('../../lib/models/CRM/Task/worker')
require('../../lib/models/CRM/Touch/worker')
require('../../lib/models/MLS/workers')
require('../../lib/models/Google/workers')
require('../../lib/models/Microsoft/workers')
require('../../lib/models/Deal/email')
require('../../lib/models/Deal/brokerwolf')
require('../../lib/models/Email/campaign/worker')
require('../../lib/models/Email/send')
require('../../lib/models/Email/events')
require('../../lib/models/SMS')
require('../../lib/models/Daily')
require('../../lib/models/Envelope')
require('../../lib/models/Trigger/worker')
require('../../lib/models/Stripe')
require('../../lib/models/Godaddy/zone')
require('../../lib/models/Godaddy/purchase')
require('../../lib/models/Listing/notify-agents')
// require('../../lib/models/Showings/worker')

/** @type {(() => Promise<void>)[]} */
let shutdowns = []

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
    queues: ['calendar', 'showings'],
    concurrency: 2
  },
  {
    queues: ['touches'],
    concurrency: 10
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
    queues: ['microsoft_cal_notifications'],
    concurrency: 1
  },
  {
    queues: ['microsoft_contacts_notifications'],
    concurrency: 1
  },
  {
    queues: ['microsoft_contacts'],
    concurrency: 5
  },
  {
    queues: ['microsoft_contacts_avatars'],
    concurrency: 5
  },
  {
    queues: ['microsoft_disconnect'],
    concurrency: 1
  },
  {
    queues: ['outlook_by_query'],
    concurrency: 5
  },

  {
    queues: ['gmail_webhooks'],
    concurrency: 3
  },
  {
    queues: ['google_cal_webhooks'],
    concurrency: 3
  },
  {
    queues: ['google_contacts'],
    concurrency: 5
  },
  {
    queues: ['google_contacts_avatars'],
    concurrency: 5
  },
  {
    queues: ['google_disconnect'],
    concurrency: 1
  },
  {
    queues: ['gmail_by_query'],
    concurrency: 2
  },

  {
    queues: ['calendar_integration'],
    concurrency: 10
  },

  {
    queues: ['contact_integration'],
    concurrency: 10
  },

  {
    queues: ['trigger'],
    concurrency: 5
  },
  {
    queues: ['brand_template_thumbnail'],
    concurrency: 100
  },
  {
    queues: ['envelope_update'],
    concurrency: 5
  },
  {
    queues: ['email_high', 'email_event'],
    concurrency: 20
  },
  {
    queues: ['daily_email'],
    concurrency: 5
  },
  {
    queues: ['email'],
    concurrency: 20
  },
  {
    queues: ['register_domain', 'create_zone', 'update_nameservers', 'capture_charge'],
    concurrency: 20
  },

  {
    queues: ['listing_notifications'],
    concurrency: 20
  }
]

const forks = [
  {
    queues: ['google', 'google_cal', 'microsoft', 'microsoft_cal'],
    concurrency: 7
  },
  {
    queues: ['email_campaign'],
    concurrency: 1
  },
  {
    queues: ['MLS.Photo', 'MLS.Listing', 'MLS.Listing.Photos.Validate'],
    concurrency: 20
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

startPeanar().catch(ex => console.error(ex))

module.exports = shutdownForks
