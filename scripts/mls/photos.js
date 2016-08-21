#!/usr/bin/env node

var async  = require('async');
var Client = require('./rets_client.js');
var fs     = require('fs');
var config = require('../../lib/config.js');

var program = require('./program.js')
      .option('-d, --download-concurency <n>', 'Download (From RETS) concurrency')
      .option('-u, --upload-concurency <n>',   'Upload   (To S3)     concurrency');
var options = program.parse(process.argv);

options.resource = 'Media';
options.class = 'Media';
options.fields = {
  id: 'matrix_unique_id',
  modified: 'ModifiedDate'
};
options.job = 'photos';

options.processor = processData;

function processData(cb, results) {
  async.mapLimit(results.mls, 100, insertPhoto, cb);
}

function insertPhoto(photo, cb) {
  Metric.increment('mls.process_photo');
  Photo.create({
    matrix_unique_id: parseInt(photo.matrix_unique_id),
    listing_mui: parseInt(photo.Table_MUI),
    description: photo.Description,
    order: parseInt(photo.Order)
  }, cb);
}

function _saveImage(payload, cb) {
  Metric.increment('mls.fetch_photo');
  if(payload.data.mime  !== 'image/jpeg') {
    Photo.markError(payload.photo.matrix_unique_id, payload.data.data.toString(), cb);
    return;
  }

  if(payload.data.data === null) {
    Photo.markError(payload.photo.matrix_unique_id, 'Data is empty', cb);
    return ;
  }

  var saveExif = (cb) => {
    Photo.setExif(payload.data.data, payload.photo.matrix_unique_id, cb);
  };


  var upload = (cb) => {
    var file = {
      name: payload.photo.matrix_unique_id,
      ext: '.jpg',
      body: payload.data.data,
      info: {
        mime: payload.data.mime,
        'mime-extension': 'jpg'
      }
    };

    S3.upload('photos', file, (err, upload) => {
      if(err)
        return cb(err);

      var url = upload.url;
      Photo.setUrl(payload.photo.matrix_unique_id, url, cb);
    });
  };

  async.parallel([saveExif, upload], cb);
}

var saveImage = async.queue(_saveImage, options.uploadConcurrency || 20);

function _fetchImage(mui, cb) {
  Client.rets.getObject('Media', 'HighRes', mui, (err, mime, data) => cb(err, {mime,data}));
}

var fetchImage = async.queue(_fetchImage, options.downloadConcurrency || 20);

function processPhoto(photo, cb) {
  fetchImage.push(photo.matrix_unique_id, (err, data) => {
    if(err)
      return cb(err);

    saveImage.push({
      photo:photo,
      data:data
    }, cb);
  });
}

function savePhotos(cb) {
  var limit = options.limit || 2000;

  Photo.getUnprocessedPhotos( {limit:limit}, (err, photos) => {
    async.map(photos, processPhoto, cb);
  });
}

Client.work(options, (err) => {
  savePhotos( err => {
    Metric.flush(process.exit);
  });
});
