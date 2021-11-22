const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/MLS/workers')
require('../../../lib/models/Google/workers')
require('../../../lib/models/Microsoft/workers')

const queues = [
  {
    queues: [
      // For email integration
      'google',
      // Actual calendar synchronization
      'google_cal',
      // For email integration
      'microsoft',
      // Actual calendar synchronization
      'microsoft_cal'
    ],
    concurrency: 100
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
