const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/MLS/workers')
const queues = [
  {
    queues: ['MLS.Listing'],
    concurrency: 50,
  },
  {
    queues: ['MLS.Listing.Validate','MLS.Listing.Photos.Validate'],
    concurrency: 20,
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
