const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/MLS/workers')
const queues = [
  {
    queues: ['MLS.Photo'],
    concurrency: 1000,
  },
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
  start,
  shutdown,
}
