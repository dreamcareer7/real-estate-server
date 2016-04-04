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
options.class = 'Unit';
options.job = 'units';
options.fields = {
  id:'matrix_unique_id'
}
options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.forEach(results.mls, upsert, cb);
}

function map(mls_unit) {
  return {
    dining_length: parseInt(mls_unit.DiningAreaLength) || null,
    dining_width: parseInt(mls_unit.DiningAreaWidth) || null,
    kitchen_length: parseInt(mls_unit.KitchenLength) || null,
    kitchen_width: parseInt(mls_unit.KitchenWidth) || null,
    lease: parseInt(mls_unit.Lease) || null,
    listing_mui: parseInt(mls_unit.Listing_MUI) || null,
    living_length: parseInt(mls_unit.LivingAreaLength) || null,
    living_width: parseInt(mls_unit.LivingAreaWidth) || null,
    master_length: parseInt(mls_unit.MasterBedLength) || null,
    master_width: parseInt(mls_unit.MasterBedWidth) || null,
    matrix_unique_id: parseInt(mls_unit.matrix_unique_id) ,
    matrix_modified_dt: mls_unit.MatrixModifiedDT,
    full_bath: parseInt(mls_unit.NumberOfBathsFull) || null,
    half_bath: parseInt(mls_unit.NumberOfBathsHalf) || null,
    beds: parseInt(mls_unit.NumberOfBeds) || null,
    units: parseInt(mls_unit.NumberOfUnits) || null,
    square_feet: parseInt(mls_unit.SqFt) || null
  }
}

var upsert = function (unit, cb) {
  Metric.increment('mls.processed_unit');
  PropertyUnit.create(map(unit), cb);
}

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}