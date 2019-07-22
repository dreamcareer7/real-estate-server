const { peanar } = require('../../lib/utils/peanar')
require('../../lib/models/index.js')()

require('../../lib/models/Contact/worker')
require('../../lib/models/MLS/workers')

async function main() {
  await peanar.worker({ queues: [
    'contacts',
    'contact_lists',
    'contact_duplicates',
  ], concurrency: 20 })
  await peanar.worker({ queues: [
    'contact_import',
  ], concurrency: 10 })

  await peanar.worker({ queues: [
    'MLS.Unit',
    'MLS.Room',
    'MLS.OpenHouse',
    'MLS.Agent',
    'MLS.Office',
    'MLS.Photo',
    'MLS.Listing',
    'MLS.Listing.Photos.Validate',
  ], concurrency: 50})

  process.on('SIGINT', () => peanar.shutdown())
  process.on('SIGTERM', () => peanar.shutdown())
}

main().catch(ex => console.error(ex))
