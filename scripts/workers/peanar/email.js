const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/MLS/workers')
const queues = [
  {
    queues: ['email_high', 'email_event'],
    concurrency: 20
  },
  {
    queues: ['email_archive'],
    concurrency: 60
  },
  {
    queues: ['email'],
    concurrency: 20
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
