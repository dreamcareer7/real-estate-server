const kue = require('kue')
const EventEmitter = require('events').EventEmitter
const async = require('async')
const queue = require('../utils/queue.js')
const Context = require('./Context')

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
    Context.log('Saving Jobs')
    async.map(jobs, (job, cb) => {
      job.save(err => {
        if (err) {
          Context.log('Error saving job', err)
          return cb(err)
        }
        Context.log('Job Saved')
        Job.emit('saved', job)
        return cb()
      })
    }, function (err, results) {
      Context.log('Saved all jobs', err)
      if (err)
        return cb(err)

      return cb()
    })
  }
})

global['Job'] = Job
module.exports = Job
