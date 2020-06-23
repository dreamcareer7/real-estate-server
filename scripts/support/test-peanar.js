const createContext = require('../workers/create-context')
const { peanar } = require('../../lib/utils/peanar')
const data = require('./test-peanar-data')
const Context = require('../../lib/models/Context')
require('../../lib/models/Job')

const enqueue = peanar.job({
  async handler(payload) {
    Context.log('handled.')
  },
  queue: 'test',
  name: 'test_fn',
  exchange: 'test'
})

// for (let i = 0; i < 10; i++) {
//   data.args[0].html += data.args[0].html
// }

async function main() {
  const { commit, rollback } = await createContext({ id: 'test-rabbit' })
  await peanar.declareAmqResources()

  Context.log('declared amq resources.')

  const timer = setInterval(() => { Context.log('Hey!') }, 100)

  for (let i = 0; i < 100000; i++) {
    enqueue(data)
  }

  // clearInterval(timer)

  await commit()
  Context.log('Shutting down peanar')
  await peanar.shutdown()
}

console.log('script started...')
main().catch(ex => {
  console.error(ex)
})
