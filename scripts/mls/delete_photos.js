#!/usr/bin/env node

var async  = require('async');
var Client = require('./rets_client.js');
var config = require('../../lib/config.js');

var program = require('./program.js')

var options = program.parse(process.argv);

options.resource = 'Media';
options.class = 'Media';
options.job = 'delete_photos';
options.processor = processData;
options.fields = {
  id: 'matrix_unique_id',
  modified: 'ModifiedDate'
};

function processData(cb, results) {
  var photos = results.mls;
  var grouped = {};

  photos.forEach( photo => {
    if(!grouped[photo.Table_MUI])
      grouped[photo.Table_MUI] = [];

    grouped[photo.Table_MUI].push(parseInt(photo.matrix_unique_id));
  })

  var markAsDeleted = (listing_id, cb) => {
    Photo.deleteMissing(listing_id, grouped[listing_id], cb);
  }

  async.forEachSeries(Object.keys(grouped), markAsDeleted, cb);
}

Photo.getUncheckedListings( (err, listings) => {
  if(err)
    return cb(err);

  if(listings.length < 1)
    return cb();

  options.query = '(Table_MUI='+listings.join(',')+')';

  Client.work(options, (err) => {
    if(err && err === 'No data was fetched') {
      var groups = {};
      listings.forEach( l => groups[l] = [] )
      async.forEachSeries(groups, markAsDeleted, cb);
      return ;
    }

    if(err)
      return cb(err);

    process.exit();
  })
})