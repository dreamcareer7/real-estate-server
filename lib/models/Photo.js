var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');

var sql_insert      = require('../sql/photo/insert.sql');
var sql_unprocessed = require('../sql/photo/unprocessed.sql');
var sql_mark_error  = require('../sql/photo/mark_as_errored.sql');
var sql_set_url     = require('../sql/photo/set_url.sql');
var sql_without_exif = require('../sql/photo/get_without_exif.sql');
var sql_set_exif     = require('../sql/photo/set_exif.sql');


Photo = {};


var schema = {
  type:'object',
  properties: {
    listing_mui: {
      required:true,
      type:'number',
    },

    description: {
      required:false,
      type:'string',
    },

    url: {
      type:'string'
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    order: {
      type: 'number',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

Photo.create = function(photo, cb) {
  validate(photo, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      photo.matrix_unique_id,
      photo.listing_mui,
      photo.description,
      photo.url,
      photo.order
    ], cb);
  });
}

Photo.getUnprocessedPhotos = function(options, cb) {
  if(!cb) {
    cb = options;
    options = {}
  }

  if(!options.limit)
    options.limit = 1000;

  db.query(sql_unprocessed, [
    options.limit
  ], (err, res) => {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Photo.markError = function(matrix_unique_id, error, cb) {
  db.query(sql_mark_error, [
    error,
    matrix_unique_id
  ], cb);
}

Photo.setUrl = function(matrix_unique_id, url, cb) {
  db.query(sql_set_url, [
    url,
    matrix_unique_id
  ], cb)
}

Photo.getPhotosWithoutExif = function(options, cb) {
  if(!cb) {
    cb = options;
    options = {}
  }

  if(!options.limit)
    options.limit = 1000;

  db.query(sql_without_exif, [
    options.limit
  ], (err, res) => {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Photo.setExif = function(exif, matrix_unique_id, cb) {
  db.query(sql_set_exif, [
    exif,
    matrix_unique_id
  ], cb)
}

module.exports = function(){};