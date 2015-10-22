require('../../lib/models/index.js')();

var config = require('../../lib/config.js');
var queue = require('../../lib/utils/queue.js');

queue.process('email', function(job, done) {
  console.log('New job email');
  SES.callSES(job.data, done);
});