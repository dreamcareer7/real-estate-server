require('../lib/models/index.js')();
var db = require('../lib/utils/db.js');
var sql = require('../lib/utils/require_sql.js');
require('./connection.js')
var async = require('async');
var ExifImage = require('exif').ExifImage;
var request = require('request').defaults({ encoding: null });

var options = {limit:100};

var isMore = true;
var isMoreImageToProcess = function() { return isMore }

var processPhoto = function(photo, cb) {
  request.get(photo.url, function (err, res, body) {
    try {
      new ExifImage({image: body}, function (error, exifData) {
        if (error) {
          console.log('Error: ' + error.message);
          return cb(error);
        }

        //convert gps data
        if(exifData.gps.GPSLatitude)
          exifData.gps.latitude = exifData.gps.GPSLatitude[0] + (exifData.gps.GPSLatitude[1]/60) + (exifData.gps.GPSLatitude[2]/3600)
        if(exifData.gps.GPSLongitude)
          exifData.gps.longitude = exifData.gps.GPSLongitude[0] + (exifData.gps.GPSLongitude[1]/60) + (exifData.gps.GPSLongitude[2]/3600)

        Photo.setExif(exifData, photo.id, function (err) {
          if (err) {
            console.log(err);
            return cb(err);
          }
        })
        console.log(photo.id + ' processed.');
        return cb();

      });
    } catch (error) {
      cb(err);
    }
  });
}

var processPhotos = function (callback) {
  console.log('Fetching new ' + options.limit + ' records');
  Photo.getPhotosWithoutExif(options, function (err, res) {
    if (err)
      return callback(err);

    if (res.length < 1) {
      isMore = false;
      console.log('No more record to process. Done!');
      return ;
    }

    async.forEach(res, processPhoto, callback);
  });
}

async.whilst(isMoreImageToProcess, processPhotos);

