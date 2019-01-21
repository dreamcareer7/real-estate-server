const async = require('async')

process.env.NODE_ENV = 'tests'

const db = require('../../lib/utils/db')
const Context = require('../../lib/models/Context')
const { handleJob } = require('../functional/jobs')
require('../../lib/models/index')()

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
    context = Context.create({
      logger() {}
    })

    context.enter()

    const res = await getDb()
    conn = res.conn
    release = res.release

    context.set({
      db: conn,
      jobs: []
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

const handleJobs = (done) => { 
  async.whilst(() => {
    const jobs = Context.get('jobs')
    return jobs.length > 0
  }, (cb) => {
    const jobs = Context.get('jobs')
    const job = jobs.shift()

    handleJob(job.type, job.data, (err, result) => {
      if (result) {
        Context.log(JSON.stringify(result, null, 2))
      }
      cb(err)
    })
  }, (err) => {
    if (err) {
      console.error(err)
      return done(err)
    }

    Context.log('finished jobs')
    return done()
  })
}

module.exports = { createContext, handleJobs }
