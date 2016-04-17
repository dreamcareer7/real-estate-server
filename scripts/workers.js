require('./connection.js');
require('colors');

var config = require('../lib/config.js');
var queue  = require('../lib/utils/queue.js');

queue.process('seamless_communication', config.email.parallel, (job, done) => {
  console.log('-> Processed a seamless communication email batch'.blue);
  Message.processSeamless(job, done);
});

queue.process('alert_share_email', config.email.parallel, (job, done) => {
  console.log('-> Processed an Alert share email'.black.greenBG);
  Alert.processEmail(job, done);
});

queue.process('alert_share_sms', config.email.parallel, (job, done) => {
  console.log('-> Processed an Alert share SMS'.black.blueBG);
  Alert.processSMS(job, done);
});

queue.process('cma_share_email', config.email.parallel, (job, done) => {
  console.log('-> Processed a CMA share email'.black.yellowBG);
  CMA.processEmail(job, done);
});

queue.process('cma_share_sms', config.email.parallel, (job, done) => {
  console.log('-> Processed a CMA share SMS'.black.magentaBG);
  CMA.processSMS(job, done);
});

queue.process('listing_share_email', config.email.parallel, (job, done) => {
  console.log('-> Processed a Listing share email'.black.yellowBG.dim);
  Listing.processEmail(job, done);
});

queue.process('listing_share_sms', config.email.parallel, (job, done) => {
  console.log('-> Processed a Listing share SMS'.black.magentaBG.dim);
  Listing.processSMS(job, done);
});

queue.process('airship_transport_send_device', config.airship.parallel, (job, done) => {
  console.log('-> Processed a push notification'.green);
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done);
});

queue.process('create_notification', config.airship.parallel, (job, done) => {
  console.log('-> Processed a notification'.yellow);
  Notification.create(job.data.notification, done);
});

queue.process('email', config.email.parallel, (job, done) => {
  console.log('-> Processed an email'.cyan);
  Mailgun.callMailgun(job.data, done);
});

queue.process('email_ses', config.email.parallel, (job, done) => {
  console.log('-> Processed an email (SES)'.black.cyanBG);
  SES.callSES(job.data, done);
});

queue.process('sms', config.twilio.parallel, (job, done) => {
  console.log('-> Processed an SMS'.magenta);
  Twilio.callTwilio(job.data, done);
});

setInterval( () => {
  Notification.sendPushForUnread(err => {
    if(err)
      console.log(err);
  })
}, 1000)