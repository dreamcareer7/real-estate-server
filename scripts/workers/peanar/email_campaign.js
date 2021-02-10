const { peanar } = require('../../../lib/utils/peanar')

require('../../../lib/models/Email/campaign/worker')

const queues = [
  {
    queues: ['email_campaign'],
    concurrency: 1
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
