const repl = require('repl')
const promisify = require('../lib/utils/promisify')
const queue = require('../lib/utils/queue')

require('../lib/models/index')()

const db = require('../lib/utils/db')
const Context = require('../lib/models/Context/index')
const redis = require('../lib/data-service/redis').createClient()

const context = Context.create({
  id: '<rechat-shell>',
  created_at: process.hrtime()
})

context.enter()

db.conn(false, (err, client) => {
  if (err) {
    process.exit(1)
  }

  const r = repl.start({
    prompt: 'Rechat Shell> ',
    replMode: repl.REPL_MODE_STRICT,
    domain: context.domain
  })

  r.on('exit', cleanup)

  r.context.context = context
  r.context.promisify = promisify

  context.set({
    db: client,
    jobs: []
  })
})


function cleanup() {
  queue.shutdown(500, (sig) => {
    console.log( '\nKue shutdown:', sig || 'OK' )
  })
  redis.quit()
  context.get('db').release()
  db.close()
}
