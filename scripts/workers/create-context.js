const Context = require('../../lib/models/Context')
const db = require('../../lib/utils/db')

const createContext = async c => {
  const Job = require('../../lib/models/Job')

  const context = Context.create({
    ...c
  })

  context.enter()

  const { conn, done } = await db.conn.promise()

  const rollback = err => {
    Context.trace('<- Rolling back on worker'.red, err)
    return conn.query('ROLLBACK', (err) => {
      done(err)
      context.exit()
    })
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

    await Job.handleContextJobs()

    context.exit()
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
    jobs: [],
    rabbit_jobs: [],
  })

  return { rollback, commit }
}

module.exports = createContext
