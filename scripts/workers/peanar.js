const { peanar } = require('../../lib/utils/peanar')

require('../../lib/models/Contact/worker')
require('../../lib/models/MLS/workers')

async function main() {
  await peanar.worker({ queues: [
    'contacts',
    'contact_lists',
    'contact_duplicates',
  ], n: 5 })
  await peanar.worker({ queues: [
    'contact_import',
  ], n: 2 })

  await peanar.worker({ queues: [
    'MLS.Unit',
    'MLS.Room',
    'MLS.OpenHouse',
    'MLS.Agent',
    'MLS.Office',
    'MLS.Photo',
    'MLS.Listing',
    'MLS.Listing.Photos.Validate',
  ], n: 10})

  process.on('SIGINT', () => peanar.shutdown())
  process.on('SIGTERM', () => peanar.shutdown())
}

main().catch(ex => console.error(ex))
