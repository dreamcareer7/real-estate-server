const Context = require('../../../lib/models/Context')
const db = require('../../../lib/utils/db')

const createContext = async c => {
  const Job = require('../../../lib/models/Job')

  const context = Context.create({
    ...c
  })

  let handled = false

  const { conn, done } = await context.run(db.conn.promise)

  const rollback = err => {
    handled = true
    Context.trace('<- Rolling back on worker'.red, err)
    return conn.query('ROLLBACK', (err) => {
      done(err)
      context.exit()
    })
  }

  const commit = async () => {
    handled = true

    try {
      await conn.query('COMMIT')
    } catch(err) {
      Context.trace('<- Commit failed!'.red)
      rollback(err)
      return
    }

    Context.log('Committed 👌')

    await Job.handleContextJobs()

    context.exit()
    done()
  }

  const errorHandler = e => {
    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound

    Context.log('⚠ Panic:'.yellow, e, e.stack)

    if (handled)
      return

    rollback(e.message)
  }

  context.on('error', async e => {
    context.run(errorHandler, e)
  })

  await conn.query('BEGIN')

  context.set({
    db: conn,
    jobs: [],
    rabbit_jobs: [],
  })

  const run = context.run

  return { rollback, commit, run, context }
}

module.exports = createContext
