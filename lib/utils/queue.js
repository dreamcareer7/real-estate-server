var kue    = require('kue');
var config = require('../config.js');

module.exports = kue.createQueue({
  redis: config.redis.url,
  options:config.redis
});
