var kue    = require('kue');
var config = require('../config.js');
var redis  = require('redis');

var q = kue.createQueue({
  redis: {
    createClientFactory: function(){
        return redis.createClient(config.redis);
    }
  }
});

q.watchStuckJobs(5000)

module.exports = q;
