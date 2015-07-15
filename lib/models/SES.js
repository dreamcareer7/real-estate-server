var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var validator = require('../utils/validator.js');
var config = require('../config.js');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var path = require('path')

AWS.config.update({region: config.email.aws_region});
var ses = new AWS.SES({apiVersion: '2010-12-01'});

SES = {};

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

SES.sendMail = function(email, cb) {
  ses.sendEmail( {
    Source: email.from,
    Destination: { ToAddresses: email.to },
    Message: {
      Subject: {
        Data: email.message.subject.data
      },
      Body: {
        Text: {
          Data: email.message.body.data
        }
      }
    },
    Source: email.source
  }, function(err, data) {
     if(err)
       console.log('(SES-Transport) Error sending email from', email.from, 'to', email.to, ':', err);

       return cb(null, data);
     });
}
