const { peanar } = require('../../lib/utils/peanar')

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

const context = Context.create({
  id: 'PeanarWorker'
})

async function main() {
  await peanar.declareAmqResources()

  await peanar.worker({
    queues: ['brokerwolf'],
    concurrency: 1
  })
  await peanar.worker({
    queues: ['deal_email'],
    concurrency: 5
  })
  await peanar.worker({
    queues: ['calendar', 'touches'],
    concurrency: 2
  })

  await peanar.worker({
    queues: ['flows', 'contacts', 'contact_lists', 'contact_duplicates', 'crm_tasks'],
    concurrency: 10
  })
  await peanar.worker({ queues: ['contact_import'], concurrency: 15 })

  await peanar.worker({
    queues: ['google', 'microsoft'],
    concurrency: 30
  })

  await peanar.worker({
    queues: ['MLS.Office', 'MLS.Unit', 'MLS.Room', 'MLS.Agent'],
    concurrency: 50
  })

  await peanar.worker({
    queues: ['email', 'email_high', 'MLS.OpenHouse', 'MLS.Photo', 'MLS.Listing', 'MLS.Listing.Photos.Validate'],
    concurrency: 20
  })
  

  await peanar.worker({
    queues: ['sms'],
    concurrency: config.twilio.parallel
  })
}

context.run(() => {
  main().catch(ex => console.error(ex))
})
