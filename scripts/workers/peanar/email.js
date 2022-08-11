const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/Email/archive/upload')
require('../../../lib/models/Email/send')
require('../../../lib/models/Email/events')

const queues = [
  {
    queues: ['email_high'],
    concurrency: 20
  },
  {
    queues: ['email'],
    concurrency: 35
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
