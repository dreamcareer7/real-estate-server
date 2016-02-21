var EventEmitter = require('events').EventEmitter;
var redis        = require('redis');
var async        = require('async');
var kue          = require('kue');
var queue        = require('../utils/queue.js');
var config       = require('../config.js');
var redisClient  = redis.createClient(config.redis);

Job       = new EventEmitter();
Job.kue   = kue;
Job.queue = queue;
Job.redis = redisClient;

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

Job.getRedisKey = function(job) {
  if(job.type == 'seamless_communication')
    return 'notificaton:message:' + job.data.room_id + ':' + job.data.user_id;

  return '';
};

Job.RequiresTracking = function(job) {
  if (job.type == 'seamless_communication')
    return true;

  return false;
};
