require('./connection.js');
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');
var async  = require('async');

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

  var reportError = err => {
    var text = '🗑 Worker Error: '+queue_name+' \n :memo: `'+JSON.stringify(err)+'`';

    Slack.send({
      channel: 'server-errors',
      text: text,
      emoji: '💀'
    })
  }

  var handler = (job, done) => {
    var examine = err => {
      if(err)
        reportError(err);

      done(err);
    }

    definition.handler(job, examine);
  }

  queue.process(queue_name, definition.parallel, handler);
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


var sendNotifications = function() {
  async.series([
    Notification.sendPushForUnread,
    Message.sendEmailForUnread,
  ], err => {
    if(err) {
      console.log(err);

      var text = '🔔 Error while sending notifications: \n :memo: `'+JSON.stringify(err)+'` \n --- \n';

      Slack.send({
        channel:'server-errors',
        text: text,
        emoji:'💀'
      });
    }

    setTimeout(sendNotifications, 1000);
  })
}

sendNotifications();
