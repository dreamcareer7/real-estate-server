#!/usr/bin/env node
var Client = require('./rets_client.js');
var colors = require('colors');
var slack = require('./slack.js');
var async = require('async');
var util = require('util');
var config = require('../../lib/config.js');
require('../../lib/models/index.js')();

Error.autoReport = false;

var program = require('./program.js')
  .option('-d, --download-concurency <n>', 'Download (From RETS) concurrency');
var options = program.parse(process.argv);

options.process = true;

options.resource = 'PropertySubTable';
options.class = 'Room';
options.additionalQuery = '(MatrixModifiedDT=2016-01-13+)';

if (options.process)
  options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, upsert, cb);
}

function map(mls_room) {
  return {
    matrix_unique_id: parseInt(mls_room.matrix_unique_id),
    matrix_modified_dt: mls_room.MatrixModifiedDT,
    description: mls_room.RoomDescription,
    length: parseInt(mls_room.RoomLength),
    width: parseInt(mls_room.RoomWidth),
    listing_mui : parseInt(mls_room.Listing_MUI),
    features: mls_room.RoomFeatures,
    level: parseInt(mls_room.RoomLevel),
    type: mls_room.RoomType
  }
}

var upsert = function (room, cb) {
  Metric.increment('mls.processed_rooms');
  Listing.getByMUI(room.Listing_MUI, function (err, listing) {
    if (listing)
      room.listing = listing.id;

    PropertyRoom.getByMUI(room.matrix_unique_id, function (err, id) {
      if (err && err.code !== 'ResourceNotFound')
        return cb(err);

      if (err && err.code === 'ResourceNotFound') {
        Metric.increment('mls.new_rooms');

        PropertyRoom.create(map(room), cb);
        return;
      }

      Metric.increment('mls.updated_rooms');
      PropertyRoom.update(id, map(room), cb);
    });
  });

}

var firstId, lastId = null;

Client.on('data fetched', (data) => {
  Client.rets.logout(); // We're done for the moment. Release the connection.

  firstId = data[0].Matrix_Unique_ID;
  lastId = data[data.length - 1].Matrix_Unique_ID;
});

function report() {
  Metric.flush();

  var text = [
    'Execution time: %d seconds',
    'Total items: %d',
    'First item: %s',
    'Last item: %s',
    'Rooms: %s new, %s updated',
    '----------------------------------'
  ].join('\n');

  text = util.format(text,
    slack.elapsed() / 1000,
    Metric.get('mls.processed_rooms'),
    firstId,
    lastId,
    Metric.get('mls.new_rooms'), Metric.get('mls.updated_rooms')
  );
  console.log(text);
}