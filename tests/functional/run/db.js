const path = require('path')
const { EventEmitter } = require('events')

const Run = new EventEmitter()
global['Run'] = Run

const db = require('../../../lib/utils/db')
const { peanar } = require('../../../lib/utils/peanar')
const async = require('async')
const AssertionError = require('assertion-error')

const Context = require('../../../lib/models/Context')

const {handleJob} = require('../jobs')

const TEMP_PATH = path.resolve(__dirname, '../temp')
require('rimraf').sync(path.resolve(TEMP_PATH, 'sms'))

const connections = {}

const database = (req, res, next) => {
  const context = Context.create()
  const suite = req.headers['x-suite']

  context.watchOver(req)
  context.watchOver(res)

  let handled = false
  const end = res.end

  context.on('error', (e) => {
    if (handled)
      return
    handled = true

    delete e.domain
    delete e.domainThrown
    delete e.domainEmitter
    delete e.domainBound

    if (e instanceof AssertionError) {
      const rootDir = path.dirname(path.resolve(__dirname, '../../index.js'))

      console.log(e.stack.split('\n')[0])
      console.log(e.stack.split('\n').filter(/** @param {string} line */line => line.includes(rootDir) && !line.includes('node_modules')).join('\n'))
      e = Error.Validation(e.message)
    }

    if (!e.http)
      e.http = 500

    console.log(e)
    process.stderr.write('Error: ' + JSON.stringify(e.stack) + '\n')

    res.status(e.http)

    if (e.http >= 500)
      res.json({message: 'Internal Error'})
    else
      res.json(e)
  })

  res.end = function (data, encoding, callback) {
    if (req.headers['x-handle-jobs'] === 'yes') {
      async.whilst(() => {
        return (Context.get('jobs') || []).length > 0 || (Context.get('rabbit_jobs') || []).length > 0
      }, cb => {
        async.parallel([
          cb => {
            async.whilst(() => {
              const jobs = Context.get('jobs')
              return jobs.length > 0
            }, (cb) => {
              const job = Context.get('jobs').shift()
              handleJob(job.type, null, job.data, (err, result) => {
                if (result) {
                  Context.log(JSON.stringify(result, null, 2))
                }
                cb(err, result)
              })
            }, cb)
          },
          cb => {
            peanar.enqueueContextJobs().nodeify(cb)
          }
        ], cb)
      }, (err) => {
        if (err) {
          console.error(err)
        }

        Context.log('finished jobs')
        end.call(res, data, encoding, callback)
      })
    }
    else (
      end.call(res, data, encoding, callback)
    )
  }

  if (connections[suite]) {
    context.set({
      db: connections[suite],
      jobs: [],
      rabbit_jobs: [],
      suite
    })
    context.run(next)
    return
  }

  db.conn((err, conn, done) => {
    if (err)
      return res.error(err)

    conn.done = done

    const cb = () => {
      connections[suite] = conn
      context.set({
        db: conn,
        jobs: []
      })
      context.run(next)
    }

    if (suite) {
      conn.query('BEGIN', (err) => {
        if (err)
          return res.error(err)

        cb()
      })
    }
    else {
      return cb()
    }
  })
}


const rollback = suite => {
  if(suite && connections[suite]) {
    connections[suite].query('ROLLBACK', connections[suite].done)
    delete connections[suite]
  }
}

module.exports = {
  database,
  rollback,
  connections,
}