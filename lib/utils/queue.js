var kue    = require('kue');
var config = require('../config.js');

module.exports = kue.createQueue({
  prefix: config.http.port,
  redis: config.redis
});
