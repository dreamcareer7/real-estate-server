const { peanar } = require('../../lib/utils/peanar')
require('../../lib/models/index.js')()
const Context = require('../../lib/models/Context')

require('../../lib/models/Calendar/worker')
require('../../lib/models/Contact/worker')
require('../../lib/models/CRM/Task/worker')
require('../../lib/models/CRM/Touch/worker')
require('../../lib/models/MLS/workers')
require('../../lib/models/Showings/worker')
require('../../lib/models/Google/workers')
require('../../lib/models/Microsoft/workers')
require('../../lib/models/Deal/email')

const context = Context.create({
  id: 'PeanarWorker'
})

async function main() {
  await peanar.declareAmqResources()

  await peanar.worker({
    queues: ['deal_email'],
    concurrency: 5
  })
  await peanar.worker({
    queues: ['calendar'],
    concurrency: 2
  })

  await peanar.worker({
    queues: ['contacts', 'contact_lists', 'contact_duplicates', 'crm_tasks'],
    concurrency: 10
  })
  await peanar.worker({ queues: ['contact_import'], concurrency: 5 })

  await peanar.worker({
    queues: ['showings', 'google', 'microsoft', 'touches'],
    concurrency: 30
  })

  await peanar.worker({
    queues: [
      'MLS.Unit',
      'MLS.Room',
      'MLS.OpenHouse',
      'MLS.Agent',
      'MLS.Office',
      'MLS.Photo',
      'MLS.Listing',
      'MLS.Listing.Photos.Validate'
    ],
    concurrency: 50
  })
}

context.run(() => {
  main().catch(ex => console.error(ex))
})
