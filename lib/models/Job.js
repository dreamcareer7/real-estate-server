const EventEmitter = require('events').EventEmitter
const async = require('async')
const queue = require('../utils/queue.js')

const Job = Object.assign(new EventEmitter(), {
  queue,

  /**
   * Create the jobs on Kue
   * @param {any[]} jobs 
   * @param {*} cb 
   */
  handle(jobs, cb) {
    async.map(jobs, (job, cb) => {
      job.save(err => {
        if (err)
          return cb(err)

        Job.emit('saved', job)
        return cb()
      })
    }, function (err, results) {
      if (err)
        return cb(err)

      return cb()
    })
  }
})

global['Job'] = Job
module.exports = Job
