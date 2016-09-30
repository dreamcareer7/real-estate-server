const EventEmitter = require('events').EventEmitter
const async = require('async')
const queue = require('../utils/queue.js')

Job = new EventEmitter()
Job.queue = queue

Job.handle = function (jobs, cb) {
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
