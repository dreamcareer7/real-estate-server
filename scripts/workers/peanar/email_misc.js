const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/Email/archive/upload')
require('../../../lib/models/Email/send')
require('../../../lib/models/Email/events')

const queues = [
  {
    queues: ['email_event'],
    concurrency: 20
  },
  {
    queues: ['email_archive'],
    concurrency: 80
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
