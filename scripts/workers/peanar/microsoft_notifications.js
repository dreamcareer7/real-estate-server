const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/Microsoft/workers')

const queues = [
  {
    // Does not scale
    queues: ['microsoft_notifications'],
    concurrency: 300,
  },
  {
    // Scale?
    queues: ['microsoft_cal_notifications'],
    concurrency: 1,
  },
  {
    // Scale?
    queues: ['microsoft_contacts_notifications'],
    concurrency: 1,
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
  start, shutdown
}
