#!/usr/bin/env node

var async = require('async')
var Client = require('./rets_client.js');
var fs = require('fs');
var config = require('../../lib/config.js');
require('../../lib/models/index.js')();

var program = require('./program.js')
  .option('-d, --download-concurency <n>', 'Download (From RETS) concurrency')
  .option('-u, --upload-concurency <n>',   'Upload   (To S3)     concurrency')
var options = program.parse(process.argv);

options.resource = 'Media';
options.class = 'Media';
options.by_id = true;
options.processor = processData;

function processData(cb, results) {
  async.mapLimit(results.mls, 100, insertPhoto, cb);
}

function insertPhoto(photo, cb) {
  Photo.create({
    matrix_unique_id:parseInt(photo.matrix_unique_id),
    listing_mui:parseInt(photo.Table_MUI),
    description:photo.Description,
    order:parseInt(photo.Order)
  }, cb);
}

function _saveImage(payload, cb) {
  if(payload.data.mime  !== 'image/jpeg') {
    Photo.markError(payload.photo.matrix_unique_id, payload.data.data.toString(), cb)
    return;
  }

  var file = {
    name:payload.photo.matrix_unique_id,
    ext:'.jpg',
    body:payload.data.data,
    mime:payload.data.mime
  }

  S3.upload(config.buckets.listing_images, file, (err, url) => {
    if(err)
      return cb(err);

    Photo.setUrl(payload.photo.matrix_unique_id, url, cb);
  });
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
    }, cb)
  });
}

function savePhotos(cb) {
  var limit = options.limit || 2000;

  Photo.getUnprocessedPhotos( {limit:limit}, (err, photos) => {
    async.map(photos, processPhoto, cb);
  });
}

Client.work(options, (err) => {
  savePhotos( err => process.exit() );
});