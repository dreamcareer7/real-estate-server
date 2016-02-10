var kue    = require('kue');
var config = require('../config.js');

module.exports = kue.createQueue({
  disableSearch: false,
  redis: config.redis
});
