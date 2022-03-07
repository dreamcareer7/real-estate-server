process.env.NODE_ENV = 'tests'

const db = require('../../lib/utils/db')
const { peanar } = require('../../lib/utils/peanar')

const Context = require('../../lib/models/Context')
const Metric = require('../../lib/models/Metric')

require('../../lib/models/Context/events')()

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, conn, release) => {
      if (err)
        return reject(err)

      resolve({conn, release})
    })
  })
}

function createContext() {
  let conn, release, context

  beforeEach(async() => {
    Metric.reset()

    const ctx = {}
    if (!process.env.CONTEXT_LOG) {
      ctx.logger = function() {}
    }
    context = Context.create(ctx)

    context.enter()

    const res = await getDb()
    conn = res.conn
    release = res.release

    context.set({
      db: conn,
      rabbit_jobs: [],
      'db:log': false
    })

    await db.executeSql.promise('BEGIN', [], conn)    
  })

  afterEach(async () => {
    context.log('ROLLBACK')
    await db.executeSql.promise('ROLLBACK', [], conn)

    context.log('Releasing connection')
    release()
    context.exit()
  })
}

const prepareContext = async c => {
  const context = Context.create({
    ...c,
    logger() {}
  })

  const { conn, done } = await db.conn.promise()

  const rollback = err => {
    Context.trace('<- Rolling back on worker'.red, err)
    return conn.query('ROLLBACK')
  }

  const commit = async () => {
    try {
      await conn.query('COMMIT')
    } catch(err) {
      Context.trace('<- Commit failed!'.red)
      return rollback(err)
    }

    Context.log('Committed 👌')
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
    rabbit_jobs: [],
  })

  return {
    done: () => context.run(async () => {
      try {
        await commit()
        done()
      } catch(err) {
        await rollback(err)
        done()
        throw err
      }
    }),
    run: context.run
  }
}

async function executeInContext(c, fn) {
  const { run, done } = await prepareContext(c)

  try {
    return await run(fn)
  } finally {
    await run(handleJobs)
    await done()
  }
}

async function handleJobs() {
  while (Context.get('rabbit_jobs').length > 0) {
    await peanar.enqueueContextJobs()
  }
}

module.exports = {
  getDb,
  handleJobs,
  executeInContext,
  prepareContext,
  createContext,
}
