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

Twilio.sendSMS = function(sms, cb) {
  queue.create('sms', sms).save(cb);
};

Twilio.callTwilio = function(sms, cb) {
  client.sendMessage({
    to: sms.to,
    from: sms.from,
    body: sprintf(sms.body, sms.template_params)
  }, function(err, response) {
    if(err)
      console.log('->'.red, 'Error sending SMS message to', sms.to.cyan, ':', err);

    return cb(null, response);
  });
};

module.exports = function(){};
