const async = require('async')

const db = require('../../lib/utils/db')
const Context = require('../../lib/models/Context')
const { handleJob } = require('../functional/jobs')
require('../../lib/models/index')()

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

  before(async() => {
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
  })
  
  beforeEach(async () => {
    await db.executeSql.promise('BEGIN', [], conn)    
  })

  afterEach(async () => {
    context.log('ROLLBACK')
    await db.executeSql.promise('ROLLBACK', [], conn)
  })

  after(() => {
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
