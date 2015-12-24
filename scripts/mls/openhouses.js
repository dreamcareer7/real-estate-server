#!/usr/bin/env node

var async   = require('async');
var Client = require('./rets_client.js');

var program = require('./program.js')
var options = program.parse(process.argv);


options.resource = 'OpenHouse';
options.class = 'OpenHouse';
options.fields = {
  id:'matrix_unique_id'
}
options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.mapLimit(results.mls, 100, insertOpenhouse, cb);
}

function insertOpenhouse(data, cb) {
  Metric.increment('mls.processed_openhouse');

  var openhouse = populate(data);

  if(!openhouse)
    return cb(); //Invalid data. For any reason.

  OpenHouse.create(openhouse, cb);
}

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}

function populate(data) {
  //We've seen cases like mui=54933611 where it has no date and it doesnt show on MLS Matrix Portal. Mark it as invalid.
//   if(!data.OpenHouseDate)
//     return false;

  var openhouse = {};

  openhouse.end_time         = parseTime(data.OpenHouseDate, data.EndTime);
  openhouse.start_time       = parseTime(data.OpenHouseDate, data.StartTime);
  openhouse.description      = data.description;
  openhouse.listing_mui      = parseInt(data.Listing_MUI);
  openhouse.refreshments     = data.refreshments;
  openhouse.type             = data.OpenHouseType;
  openhouse.matrix_unique_id = parseInt(data.matrix_unique_id);

  return openhouse;
}

function parseTime(date, time) {
  if(time.length > 4)
    time = time.slice(0,4);

  time = ('0000'+time).slice(-4);

  var hours =   time.slice(0,2);
  var minutes = time.slice(2,4);

  var timestamp = (new Date(date)).getTime();
  timestamp += hours*3600*1000;
  timestamp += minutes*60*1000;

  return new Date(timestamp).toISOString();
}