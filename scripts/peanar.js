const { peanar } = require('../lib/utils/peanar')

require('../lib/models/Contact/worker')

async function main() {
  await peanar.worker({ queues: [
    'contacts',
    'contact_lists',
    'contact_duplicates',
  ], n: 5 })

  process.on('SIGINT', () => peanar.shutdown())
  process.on('SIGTERM', () => peanar.shutdown())
}

main().catch(ex => console.error(ex))
