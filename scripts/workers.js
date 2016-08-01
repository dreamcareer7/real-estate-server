require('./connection.js');
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');

var seamless = (job, done) => {
  Message.processSeamless(job, done);
};

var airship = (job, done) => {
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done);
};

var notification = (job, done) => {
  Notification.create(job.data.notification, done);
};

var email = (job, done) => {
  Mailgun.callMailgun(job.data, done);
};

var ses = (job, done) => {
  SES.callSES(job.data, done);
};

var sms = (job, done) => {
  Twilio.callTwilio(job.data, done);
};

var queues = {
  seamless_communication: {
    handler: seamless,
    parallel: config.email.parallel
  },

  airship_transport_send_device: {
    handler: airship,
    parallel: config.airship.parallel
  },

  create_notification: {
    handler: notification,
    parallel: config.airship.parallel
  },

  email: {
    handler: email,
    parallel: config.email.parallel
  },

  email_ses: {
    handler: ses,
    parallel: config.email.parallel
  },

  sms: {
    handler: sms,
    parallel: config.twilio.parallel
  }
};

Object.keys(queues).forEach( queue_name => {
  var definition = queues[queue_name];
  queue.process(queue_name, definition.parallel, definition.handler);
});

setInterval(reportQueueStatistics, 10000);

function reportQueueStatistics() {
  queue.inactiveCount( (err, count) => {
    if(err)
      return Metric.set('inactive_jobs', 99999);

    return Metric.set('inactive_jobs', count);
  });
}

reportQueueStatistics();

var sendPushForUnread = function() {
  Notification.sendPushForUnread(err => {
    if(err)
      console.log(err);

    setTimeout(sendPushForUnread, 1000);
  });
};

sendPushForUnread();
