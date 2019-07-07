const { peanar } = require('../lib/utils/peanar')

require('../lib/models/Contact/worker')

async function main() {
  await peanar.worker({ queues: ['contact'], n: 5 })
  await peanar.worker({ queues: ['mls'], n: 15 })

  process.on('SIGINT', () => peanar.shutdown())
  process.on('SIGTERM', () => peanar.shutdown())
}

main().catch(ex => console.error(ex))
