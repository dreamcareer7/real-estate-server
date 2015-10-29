require('./connection.js');
require('../lib/models/index.js')();
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');

queue.process('airship_transport_send', config.airship.parallel, function(job, done) {
  console.log('<-'.green + ' Processed an Airship push notification');
  Notification.send(job.data.user_id, job.data.room_id, job.data.airship_notification, done);
});

queue.process('email', config.email.parallel, function(job, done) {
  console.log('<-'.cyan + ' Processed a SES email');
  SES.callSES(job.data, done);
});

queue.process('sms', config.twilio.parallel, function(job, done) {
  console.log('<-'.magenta + ' Processed a Twilio SMS');
  twilio.callTwilio(job.data, done);
});
