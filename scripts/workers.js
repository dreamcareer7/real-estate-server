require('./connection.js');
require('../lib/models/index.js')();
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');

queue.process('airship_transport_send', config.airship.parallel, function(job, done) {
  console.log('<- Processed an Airship push notification'.green);
  Notification.send(job.data.user_id, job.data.room_id, job.data.airship_notification, done);
});

queue.process('email', config.email.parallel, function(job, done) {
  console.log('<- Processed a SES email'.cyan);
  SES.callSES(job.data, done);
});

queue.process('sms', config.twilio.parallel, function(job, done) {
  console.log('<- Processed a Twilio SMS'.magenta);
  Twilio.callTwilio(job.data, done);
});
