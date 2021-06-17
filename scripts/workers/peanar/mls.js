const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/MLS/workers')
const queues = [
  {
    queues: ['MLS.Listing', 'MLS.Listing.Low', 'MLS.Listing.Photos.Validate'],
    concurrency: 20,
  }, {
    queues: ['MLS.Photo'],
    concurrency: 120,
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
