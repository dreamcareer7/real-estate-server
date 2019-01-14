const repl = require('repl')
const promisify = require('../lib/utils/promisify')
const queue = require('../lib/utils/queue')
const program = require('commander')
const Brand = require('../lib/models/Brand')
const Job = require('../lib/models/Job')
const User = require('../lib/models/User')

program
  .usage('npm run shell [options]')
  .option('-u, --user <user>', 'user-id to be preset on context')
  .option('-b, --brand <brand>', 'brand-id to be preset on context')
  .parse(process.argv)

require('../lib/models/index')()

const db = require('../lib/utils/db')
const sql = require('../lib/models/SupportBot/sql')
const Context = require('../lib/models/Context/index')
const redis = require('../lib/data-service/redis').createClient()

const attachContactEvents = require('../lib/models/Contact/events')
const attachTouchEventHandler = require('../lib/models/CRM/Touch/events')

attachContactEvents()
attachTouchEventHandler()

const context = Context.create({
  id: '<rechat-shell>',
  created_at: process.hrtime()
})

context.enter()

db.conn(async (err, client) => {
  if (err) {
    process.exit(1)
  }

  const r = repl.start({
    prompt: 'Rechat Shell> ',
    replMode: repl.REPL_MODE_STRICT,
    domain: context.domain
  })

  r.on('exit', cleanup)

  r.context.db = db
  r.context.sql = sql
  r.context.context = context
  r.context.promisify = promisify
  r.context.handleJobs = async () => { 
    await promisify(Job.handle)(Context.get('jobs'))
    Context.set({ jobs: [] })
  }

  context.set({
    db: client,
    jobs: []
  })

  if (program.user) {
    const user = await User.get(program.user)
    context.log(`Logged in as ${user.display_name}`)
    context.set({ user })
  }

  if (program.brand) {
    const brand = await Brand.get(program.brand)
    context.log(`Active brand set to ${brand.name}`)
    context.set({ brand })
  }
})


function cleanup() {
  queue.shutdown(500, () => {})
  redis.quit()
  context.get('db').release()
  db.close()
  process.exit()
}
