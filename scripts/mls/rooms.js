#!/usr/bin/env node
var Client = require('./rets_client.js');
var colors = require('colors');
var slack = require('./slack.js');
var async = require('async');
var util = require('util');
var config = require('../../lib/config.js');

var program = require('./program.js')
var options = program.parse(process.argv);

options.resource = 'PropertySubTable';
options.class = 'Room';
options.job = 'rooms';
options.fields = {
  id:'matrix_unique_id'
}
options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, insert, cb);
}

function map(mls_room) {
  return {
    matrix_unique_id: parseInt(mls_room.matrix_unique_id),
    matrix_modified_dt: mls_room.MatrixModifiedDT,
    description: mls_room.RoomDescription,
    length: parseInt(mls_room.RoomLength) || null,
    width: parseInt(mls_room.RoomWidth) || null,
    listing_mui : mls_room.Listing_MUI,
    features: mls_room.RoomFeatures,
    level: parseInt(mls_room.RoomLevel) || null,
    room_type: mls_room.RoomType
  }
}

var insert = function (room, cb) {
  Metric.increment('mls.processed_room');
  PropertyRoom.create(map(room), cb);
}

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}