#!/usr/bin/env node

var async  = require('async');
var Client = require('./rets_client.js');
var config = require('../../lib/config.js');

var program = require('./program.js')

var options = program.parse(process.argv);

options.resource = 'Media';
options.class = 'Media';
options.job = 'delete_photos';
options.processor = (cb, results) => processData(results.mls, cb);
options.fields = {
  id: 'matrix_unique_id',
  modified: 'ModifiedDate'
};

var grouped = {};

function processData(photos, cb) {
  photos.forEach( photo => {
    grouped[photo.Table_MUI].push(parseInt(photo.matrix_unique_id));
  })

  var markAsDeleted = (listing_mui, cb) => {
    Photo.deleteMissing(listing_mui, grouped[listing_mui], cb);
  }

  async.forEachSeries(Object.keys(grouped), markAsDeleted, cb);
}

Photo.getUncheckedListings( (err, listings) => {
  if(err)
    return cb(err);

  if(listings.length < 1)
    return cb();

  listings.forEach( l => grouped[l] = [] );

  options.query = '(Table_MUI='+listings.join(',')+')';

  Client.work(options, (err) => {
    if(err && err === 'No data was fetched')
      return processData([], cb);

    if(err)
      return cb(err);

    process.exit();
  })
})