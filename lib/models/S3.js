var db = require('../utils/db.js');
var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var validator = require('../utils/validator.js');
var config = require('../config.js');
var multiparty = require('multiparty');
var util = require('util');
var fs = require('fs');
var path = require('path')

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

S3.upload = function(bucket, file, cb) {
  var key = ((file.name) ? (file.name + file.ext) : (uuid.v1() + file.ext));
  s3.createBucket({Bucket: bucket}, function() {
    var params = {Bucket: bucket,
                  Key: key,
                  Body: file.body};
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

    var target = (files.media) ? files.media[0] : files.image[0];
    var fpath = target.path;
    var ext = path.extname(target.originalFilename);
    var name = path.basename(target.originalFilename, ext);

    fs.readFile(fpath, function(err, body) {
      if(err)
        return cb(Error.FileSystem());

      fs.unlink(fpath, function(err, ok) {
        if(err)
          return cb(Error.FileSystem());

        return cb(null, {body: body, ext: ext, name: name});
      });
    });
  });
}

module.exports = function(){};