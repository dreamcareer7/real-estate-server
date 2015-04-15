var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var validator = require('../utils/validator.js');
var config = require('../config.js');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');

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
      if (err) {
        console.log(err);
        return cb(Error.Amazon());
      } else {
        return cb(null, config.amazon.cfbase + key);
      }
    });
  });
}

S3.parseSingleFormData = function(req, cb) {
  var form = new multiparty.Form({autoFiles: false});

  form.parse(req, function(err, fields, files) {
    if(err) {
      if(err.statusCode)
        return cb(Error.BadRequest());

      return cb(Error.Generic());
    }

    console.log(files);
    console.log(fields);

    var path = (files.file) ? files.file[0].path : files.image[0].path;
    fs.readFile(path, function(err, data) {
      if(err)
        return cb(Error.FileSystem());

      fs.unlink(path, function(err, ok) {
        if(err)
          return cb(Error.FileSystem());

        return cb(null, data);
      });
    });
  });
}
