const { peanar } = require('../../lib/utils/peanar')

require('../../lib/models/index.js')()
const Context = require('../../lib/models/Context')

require('../../lib/models/MLS/workers')

const context = Context.create({
  id: 'mls-workers'
})

async function start() {
  await peanar.declareAmqResources()
  await peanar.worker({
    queues: ['MLS.Listing'],
    concurrency: 1
  })

  Context.log('started.')
}

process.on('SIGINT', () => {
  peanar.shutdown().catch(err => {
    console.error(err)
  }).finally(() => process.exit())
})
context.run(() => {
  start().catch(ex => context.error(ex))
})
