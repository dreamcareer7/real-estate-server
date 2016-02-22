var kue    = require('kue');
var config = require('../config.js');
var redis  = require('redis');

module.exports = kue.createQueue({
  redis: {
    createClientFactory: function(){
        return redis.createClient(config.redis);
    }
  }
});
