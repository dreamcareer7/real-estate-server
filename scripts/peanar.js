const { peanar } = require('../lib/utils/peanar')

require('../lib/models/Contact/worker')

async function main() {
  await peanar.worker('contacts')

  process.on('SIGINT', () => peanar.shutdown())
  process.on('SIGTERM', () => peanar.shutdown())
}

main().catch(ex => console.error(ex))
