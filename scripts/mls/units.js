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
options.class = 'Unit';
options.additionalQuery = '(MatrixModifiedDT=2016-01-01+)';

if (options.process)
  options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, upsert, cb);
}

function map(mls_unit) {
  return {
    dining_length: parseInt(mls_unit.DiningAreaLength),
    dining_width: parseInt(mls_unit.DiningAreaWidth),
    kitchen_length: parseInt(mls_unit.KitchenLength),
    kitchen_width: parseInt(mls_unit.KitchenWidth),
    lease: parseInt(mls_unit.Lease),
    listing_mui: parseInt(mls_unit.Listing_MUI),
    listing: mls_unit.listing,
    living_length: parseInt(mls_unit.LivingAreaLength),
    living_width: parseInt(mls_unit.LivingAreaWidth),
    master_length: parseInt(mls_unit.MasterBedLength),
    master_width: parseInt(mls_unit.MasterBedWidth),
    matrix_unique_id: parseInt(mls_unit.matrix_unique_id),
    matrix_modified_dt: mls_unit.MatrixModifiedDT,
    full_bath: parseInt(mls_unit.NumberOfBathsFull),
    half_bath: parseInt(mls_unit.NumberOfBathsHalf),
    beds: parseInt(mls_unit.NumberOfBeds),
    units: parseInt(mls_unit.NumberOfUnits),
    square_meters: parseInt(mls_unit.SqFt)
  }
}

var upsert = function (unit, cb) {
  Metric.increment('mls.processed_units');
  Listing.getByMUI(unit.Listing_MUI, function (err, listing) {
    if (listing)
      unit.listing = listing.id;

    Unit.getByMUI(unit.matrix_unique_id, function (err, id) {
      if (err && err.code !== 'ResourceNotFound')
        return cb(err);

      if (err && err.code === 'ResourceNotFound') {
        Metric.increment('mls.new_units');

        Unit.create(map(unit), cb);
        return;
      }

      Metric.increment('mls.updated_units');
      Unit.update(id, map(unit), cb);
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
    'Units: %s new, %s updated',
    '----------------------------------'
  ].join('\n');

  text = util.format(text,
    slack.elapsed() / 1000,
    Metric.get('mls.processed_units'),
    firstId,
    lastId,
    Metric.get('mls.new_units'), Metric.get('mls.updated_units')
  );
  console.log(text);
}