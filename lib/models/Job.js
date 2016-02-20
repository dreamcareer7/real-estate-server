var EventEmitter = require('events').EventEmitter;
var redis        = require('redis');
var kue          = require('kue');
var queue        = require('../utils/queue.js');
var config       = require('../config.js');

var redisClient  = redis.createClient(config.redis);

Job       = new EventEmitter();
Job.kue   = kue;
Job.queue = queue;
Job.redis = redisClient;

Job.handle = function(jobs) {
  jobs.map(job => {
    job.save(err => {
      if(err)
        return ;

      Job.emit('saved', job);
    });
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
