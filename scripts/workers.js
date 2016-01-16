require('./connection.js');
require('../lib/models/index.js')();
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');

queue.process('airship_transport_send_device', config.airship.parallel, function(job, done) {
  console.log('-> Processed a push notification'.green);
  Notification.sendToDevice(job.data.notification, job.data.token, done);
});

queue.process('email', config.email.parallel, function(job, done) {
  console.log('-> Processed an email'.cyan);
  Mailgun.callMailgun(job.data, done);
});

queue.process('sms', config.twilio.parallel, function(job, done) {
  console.log('-> Processed an SMS'.magenta);
  Twilio.callTwilio(job.data, done);
});
