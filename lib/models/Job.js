var EventEmitter = require('events').EventEmitter;
var redis        = require('redis');
var async        = require('async');
var queue        = require('../utils/queue.js');
var config       = require('../config.js');

Job       = new EventEmitter();
Job.queue = queue;

Job.handle = function(jobs, cb) {
  async.map(jobs, (job, cb) => {
    job.save(err => {
      if(err)
        return cb(err);

      Job.emit('saved', job);
      return cb();
    });
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb();
  });
};
