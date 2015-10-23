require('./connection.js');
require('../lib/models/index.js')();

var config = require('../lib/config.js');
var queue = require('../lib/utils/queue.js');

queue.process('airship_transport_send', config.airship.parallel, function(job, done) {
  console.log('New Notification Job');
  Notification.send(job.data.user_id, job.data.room_id, job.data.airship_notification, done);
});

queue.process('email', config.email.parallel, function(job, done) {
  console.log('New job email');
  SES.callSES(job.data, done);
});