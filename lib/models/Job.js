const kue = require('kue')
const EventEmitter = require('events').EventEmitter
const async = require('async')
const queue = require('../utils/queue.js')
const { peanar } = require('../utils/peanar')
const Context = require('./Context')
const promisify = require('../utils/promisify')

if (process.env.NODE_ENV === 'tests') {
  const save = kue.Job.prototype.save

  /**
   * 
   * @param {Function=} fn 
   */
  kue.Job.prototype.save = function(fn) {
    const jobs = Context.get('jobs')

    jobs.push(this)
    return save.call(this, fn)
  }
}

const Job = Object.assign(new EventEmitter(), {
  queue,

  /**
   * Create the jobs on Kue
   * @param {any[]} jobs 
   * @param {*} cb 
   */
  handle(jobs, cb) {
    if (jobs.length > 0) {
      Context.log(`Saving ${jobs.length} Kue Jobs`)
    }
    async.mapLimit(jobs, 100, (job, cb) => {
      job.save(err => {
        if (err) {
          Context.log('Error saving Kue job', err)
          return cb(err)
        }
        // Job.emit('saved', job)
        return cb()
      })
    }, function (err, results) {
      // Context.log('Saved all Kue jobs', err)
      if (err)
        return cb(err)

      return cb()
    })
  },

  async handleContextJobs() {
    await Promise.all([
      promisify(Job.handle)(Context.get('jobs')),
      peanar.enqueueContextJobs()
    ])

    Context.set({
      jobs: [],
      rabbit_jobs: []
    })
  }
})

module.exports = Job
