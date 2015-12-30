/**
 * @namespace S3
 */

var db         = require('../utils/db.js');
var AWS        = require('aws-sdk');
var uuid       = require('node-uuid');
var validator  = require('../utils/validator.js');
var config     = require('../config.js');
var multiparty = require('multiparty');
var util       = require('util');
var fs         = require('fs');
var path       = require('path');
var Exif       = require('exif-parser');

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
};

/**
 * @typedef file
 * @type {object}
 * @memberof S3
 * @instance
 * @property {string=} name - file name
 * @property {string} ext - file extension
 * @property {buffer} body - file content
 */

var validate = validator.bind(null, schema);

/**
 * Uploads a file on S3 service. If a file name is not specified, a UUID version 1
 * is automatically generated to be used as file name. A file extension has to be
 * present in order for this method to work properly.
 * @name upload
 * @function
 * @memberof S3
 * @instance
 * @public
 * @param {string} bucket - name of the S3 bucket to upload this file to
 * @param {S3#file} file - full file object
 * @param {callback} cb - callback function
 * @returns {URL} full URL of the object
 */
S3.upload = function(bucket, file, cb) {
  var key = ((file.name) ? (file.name + file.ext) : (uuid.v1() + file.ext));
  var params = {Bucket: bucket,
                Key: key,
                Body: file.body};

  if(file.mime)
    params.ContentType = file.mime;

  s3.putObject(params, function(err, data) {
    if (err) {
      console.log(err);
      return cb(Error.Amazon());
    } else {

      var url = config.cdns[bucket] + key;
      return cb(null, config.cdns[bucket] + key);
    }
  });
};

/**
 * Parses a multipart request and receives the incoming object. This object
 * must be present in request and labeled as `media` or `image` in order for
 * this method to work properly. The incoming file is then stored in a temporary
 * location, usually /tmp as specified by host operating system specification.
 * After the incoming file is received, we remove it from the file system.
 * @name parseSingleFormData
 * @function
 * @memberof S3
 * @instance
 * @public
 * @param {req} req - HTTP request object
 * @param {callback} cb - callback function
 * @returns {S3#file} full file object
 */
S3.parseSingleFormData = function(req, cb) {
  var form = new multiparty.Form({autoFiles: false});

  form.parse(req, function(err, fields, files) {
    if(err) {
      if(err.statusCode) {
        return cb(Error.BadRequest());
      } else {
        return cb(Error.Generic());
      }
    }

    if(!files.media && !files.image)
      return cb(Error.Validation('Upload must contain either media or image keys'));

    var target = (files.media) ? files.media[0] : files.image[0];
    var fpath = target.path;
    var ext = path.extname(target.originalFilename);
    var name = path.basename(target.originalFilename, ext);

    fs.readFile(fpath, function(err, body) {
      if(err)
        return cb(Error.FileSystem());

      try {
        var parser = Exif.create(body);
        parser.enableImageSize(false);
        var tags = parser.parse().tags;
      } catch(err) {}

      fs.unlink(fpath, function(err, ok) {
        if(err)
        return cb(Error.FileSystem());

        return cb(null, {user: req.user.id, body: body, ext: ext, name: name, metadata: tags});
      });
    });
  });
};

module.exports = function(){};
