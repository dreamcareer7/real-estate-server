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
  if(Job.isSeamless(job))
    return Job.getSeamlessKey(job);

  return '';
};

Job.requiresTracking = function(job) {
  // Seamless Messages
  if(Job.isSeamless(job))
    return true;

  return false;
};

Job.isSeamless = function(job) {
  if (job.data &&
      job.data.notification &&
      job.data.notification.subject_class == 'User' &&
      job.data.notification.action == 'Sent' &&
      job.data.notification.object_class == 'Message')
    return true;

  if (job.type == 'seamless_communication')
    return true;

  return false;
};

Job.getSeamlessKey = function(job) {
  if(job.data && job.data.room_id && job.data.user_id)
    return 'notificaton:message:' + job.data.room_id + ':' + job.data.user_id;
  // else if(job.data &&
  //         job.data.notification &&
  //         job.data.notification.room &&
  //         job.data.notification.subject)
  //   return 'notification:message:' + job.data.notification.room + ':' + jon.data.notification.

  return '';
};
