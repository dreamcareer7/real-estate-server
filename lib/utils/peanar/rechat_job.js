const db = require('../db')
const promisify = require('../promisify')

const Context = require('../../models/Context')
const Job = require('../../models/Job')

const PeanarJob = require('./job')

class RechatJob extends PeanarJob {
  _prepareContext(c, cb) {
    const context = Context.create({
      ...c
    })

    context.enter()

    db.conn(function(err, conn, done) {
      if (err) return cb(Error.Database(err))

      const rollback = function(err) {
        Context.trace('<- Rolling back on worker'.red, err)

        conn.query('ROLLBACK', done)
      }

      const commit = cb => {
        conn.query('COMMIT', function(err) {
          if (err) {
            Context.trace('<- Commit failed!'.red)
            return rollback(err)
          }

          Context.log('Committed 👌')

          done()
          const jobs = context.get('jobs')
          Job.handle(jobs, cb)
        })
      }

      conn.query('BEGIN', function(err) {
        if (err) return cb(Error.Database(err))

        context.set({
          db: conn,
          jobs: []
        })

        context.run(() => {
          cb(null, { rollback, commit })
        })
      })

      context.on('error', function(e) {
        delete e.domain
        delete e.domainThrown
        delete e.domainEmitter
        delete e.domainBound

        Context.log('⚠ Panic:'.yellow, e, e.stack)
        rollback(e.message)
      })
    })
  }

  async perform() {
    const id = `this-${this.queue}-${this.name ? this.name + '-' : ''}${this.id ? this.id : ''}`
    const { commit, rollback } = await promisify(this._prepareContext)({ id })

    try {
      const result = await super.perform()
      await promisify(commit)()

      return result
    } catch (ex) {
      await promisify(rollback)(ex)
      throw ex
    }
  }
}

module.exports = RechatJob
