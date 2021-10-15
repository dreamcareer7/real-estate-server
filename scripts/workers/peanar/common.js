const { peanar } = require('../../../lib/utils/peanar')

const config = require('../../../lib/config')

require('../../../lib/models/Calendar/worker')
require('../../../lib/models/Contact/worker')
require('../../../lib/models/Flow/worker')
require('../../../lib/models/Showing/showing/worker')
require('../../../lib/models/CRM/Task/worker')
require('../../../lib/models/CRM/Touch/worker')
require('../../../lib/models/MLS/workers')
require('../../../lib/models/Google/workers')
require('../../../lib/models/Microsoft/workers')
require('../../../lib/models/Deal/email')
require('../../../lib/models/Deal/brokerwolf')
require('../../../lib/models/Deal/D365')
require('../../../lib/models/Email/send')
require('../../../lib/models/Email/events')
require('../../../lib/models/SMS')
require('../../../lib/models/Daily')
require('../../../lib/models/Envelope')
require('../../../lib/models/Trigger/worker')
require('../../../lib/models/Trigger/brand_trigger/workers')
require('../../../lib/models/Stripe')
require('../../../lib/models/Godaddy/zone')
require('../../../lib/models/Godaddy/purchase')
require('../../../lib/models/Brand/webhook/trigger')
require('../../../lib/models/Listing/notify-agents')
require('../../../lib/controllers/contact/attributes')
require('../../../lib/controllers/contact/contact')

require('../../../lib/models/Showing/showinghub/showable_listing')
require('../../../lib/models/Showing/showinghub/appointment')
require('../../../lib/models/Showing/showinghub/webhook')

const queues = [
  {
    queues: ['showinghub'],
    concurrency: 1
  },
  {
    queues: ['brokerwolf', 'd365'],
    concurrency: 1
  },
  {
    queues: ['deal_email'],
    concurrency: 5
  },
  {
    queues: ['calendar', 'touches', 'showings'],
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
    queues: ['MLS.OpenHouse', 'MLS.Unit'],
    concurrency: 20
  },
  {
    queues: ['sms'],
    concurrency: config.twilio.parallel
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
    concurrency: 2
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
    queues: ['trigger', 'brand_trigger'],
    concurrency: 5
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
  },

  {
    queues: ['brand_webhook'],
    concurrency: 50
  }
]

async function start() {
  try {
    await peanar.declareAmqResources()
  } catch (ex) {
    console.error(ex)
  }

  for (const q of queues) {
    await peanar.worker(q)
  }
}

async function shutdown() {
  await peanar.shutdown()
}

module.exports = {
  start, shutdown
}
