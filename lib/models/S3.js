var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var validator = require('../utils/validator.js');
var config = require('../config.js');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');

var form = new multiparty.Form({autoFiles: false});
var s3 = new AWS.S3();

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
        return cb(null, config.amazon.cfbase + key);
      }
    });
  });
}

S3.parseSingleFormData = function(req, cb) {
  form.parse(req, function(err, fields, files) {
    if(err)
      return cb(err);

    var path = (files.image) ? files.image[0].path : files.upload[0].path;
    fs.readFile(path, function(err, data) {
      if(err)
        return cb(err);

      fs.unlink(path, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, data);
      });
    });
  });
}
