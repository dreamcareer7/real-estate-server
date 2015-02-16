var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var uuid = require('node-uuid');
var validator = require('../utils/validator.js');
var config = require('../config.js');

S3 = {};

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

S3.upload = function(bucket, body, cb) {
  var key = uuid.v4();
  s3.createBucket({Bucket: bucket}, function() {
    var params = {Bucket: bucket,
                  Key: key,
                  Body: body};
    s3.putObject(params, function(err, data) {
      if (err)
        return cb(err);
      else {
        console.log(config + key);
        return cb(null, config.amazon.cfbase + key);
      }
    });
  });
}
