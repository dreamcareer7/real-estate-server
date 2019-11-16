process.env.NODE_ENV = 'tests'

const db = require('../../lib/utils/db')
const { peanar } = require('../../lib/utils/peanar')
const promisify = require('../../lib/utils/promisify')

const Context = require('../../lib/models/Context')
const Metric = require('../../lib/models/Metric')
const { handleJob } = require('../functional/jobs')
require('../../lib/models/index')()

const attachCalendarEvents = require('../../lib/models/Calendar/events')
const attachContactEvents = require('../../lib/models/Contact/events')
const attachFlowEvents = require('../../lib/models/Flow/events')
const attachTaskEventHandler = require('../../lib/models/CRM/Task/events')
const attachTouchEventHandler = require('../../lib/models/CRM/Touch/events')

attachCalendarEvents()
attachContactEvents()
attachFlowEvents()
attachTouchEventHandler()
attachTaskEventHandler()

// Mock Socket so Notification can work in unit tests
global['Socket'] = {
  send(_event, _room, _args, cb) { if (typeof cb === 'function') return cb() },
  join(_user, _room_id) {}
}

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

    context = Context.create({
      logger() {}
    })

    context.enter()

    const res = await getDb()
    conn = res.conn
    release = res.release

    context.set({
      db: conn,
      jobs: [],
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

async function handleJobs() {
  while (Context.get('jobs').length > 0 || Context.get('rabbit_jobs').length > 0) {
    while (Context.get('jobs').length > 0) {
      const job = Context.get('jobs').shift()
      await promisify(handleJob)(job.type, null, job.data)
    }
    await peanar.enqueueContextJobs()
  }
}

module.exports = { createContext, handleJobs }
