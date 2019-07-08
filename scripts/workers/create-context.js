const Context = require('../../lib/models/Context')
const Job = require('../../lib/models/Job')
const db = require('../../lib/utils/db')
const { peanar } = require('../../lib/utils/peanar')
const promisify = require('../../lib/utils/promisify')

const createContext = async c => {
  const context = Context.create({
    ...c
  })

  context.enter()

  const { conn, done } = await db.conn.promise()

  const rollback = err => {
    Context.trace('<- Rolling back on worker'.red, err)
    return conn.query('ROLLBACK', done)
  }

  const commit = async () => {
    try {
      await conn.query('COMMIT')
    } catch(err) {
      Context.trace('<- Commit failed!'.red)
      rollback(err)
      return
    }

    Context.log('Committed 👌')

    while (context.get('jobs').length > 0 || context.get('rabbit_jobs').length > 0) {
      await promisify(Job.handle)(context.get('jobs'))
      await peanar.enqueueContextJobs()
    }

    done()
  }

  context.on('error', function (e) {
    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound

    Context.log('⚠ Panic:'.yellow, e, e.stack)
    rollback(e.message)
  })

  await conn.query('BEGIN')

  context.set({
    db: conn,
    jobs: []
  })

  context.enter()

  return { rollback, commit }
}

module.exports = createContext
