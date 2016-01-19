/**
 * @namespace Twilio
 */

var db        = require('../utils/db.js');
var AWS       = require('aws-sdk');
var validator = require('../utils/validator.js');
var config    = require('../config.js');
var sprintf   = require('sprintf-js').sprintf;
var queue     = require('../utils/queue.js');

var client    = require('twilio')(config.twilio.sid, config.twilio.auth_token);


SMS = {};
Twilio = {};

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true
    }
  }
};

SMS.send = function(sms, cb) {
  return Twilio.sendSMS(sms, cb);
};

Twilio.sendSMS = function(sms, cb) {
  process.domain.jobs.push(queue.create('sms', sms));
  cb();
};

Twilio.callTwilio = function(sms, cb) {
  client.sendMessage({
    to: sms.to,
    from: sms.from,
    body: sprintf(sms.body, sms.template_params)
  }, function(err, response) {
    if(err)
      console.log('<- (Twilio-Transport) Error sending SMS message to'.red, sms.to.yellow, ':', JSON.stringify(err));
    else
      console.log('<- (Twilio-Transport) Successfully sent a message to'.magenta, sms.to.yellow);

    return cb(null, response);
  });
};

module.exports = function(){};
