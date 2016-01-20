#!/usr/bin/env node

var Client = require('./rets_client.js');
var colors = require('colors');
var async  = require('async');
var config = require('../../lib/config.js');
var util   = require('util');
var fs     = require('fs');

Error.autoReport = false;

var program = require('./program.js')
var options = program.parse(process.argv);

options.processor = processData;

options.resource = 'Property';
options.class = 'Listing';
options.job = 'old_listings';

function upsertAddress(address, cb) {
  Address.getByMUI(address.matrix_unique_id, function(err, current) {
    if(current)
      return cb(null, current.id);

    Metric.increment('mls.old.new_address');
    Address.create(address, cb);
  });
}

function upsertProperty(property, address_id, cb) {
  property.address_id = address_id;

  Property.getByMUI(property.matrix_unique_id, function(err, current) {
    if(current)
      return cb(null, current.id);

    Metric.increment('mls.old.new_property');
    Property.create(property, cb);
  });
}

function upsertListing(listing, property_id, cb) {
  listing.property_id = property_id;

  Listing.getByMUI(listing.matrix_unique_id, function(err, current) {
    if(current)
      return cb(null, current.id);

    Metric.increment('mls.old.new_listing');
    Listing.create(listing, cb);
  });
}

function processData(cb, results) {
  async.mapLimit(results.mls, 200, createObjects, cb);
}

var populate = require('./populate.js');
function createObjects(data, cb) {
  var populated = populate(data);
  var address = populated.address;
  var property = populated.property;
  var listing = populated.listing;

  Metric.increment('mls.old.processed_listing');

  async.waterfall([
    upsertAddress.bind(null, address),
    upsertProperty.bind(null, property),
    upsertListing.bind(null, listing),
  ], cb);
}

MLSJob.getLastRun(options.job, (err, last_run) => {
  if(err)
    return cb(err);

  if(!last_run)
    var last_run = {
      last_modified_date: new Date
    };

  var q = buildQuery(last_run);
  options.query = q;

  Client.work(options, report);
});

Client.on('data fetched', (data) => console.log('Fetched', data.length));

function report(err) {
  if(err)
    console.log(err);

  process.exit();
}

function buildQuery(last_run) {
  var query = '(MatrixModifiedDT=%s-),(MatrixModifiedDT=%s+)';
  var from  = last_run.last_modified_date;
  var to    = new Date(from.getTime() - (1000 * 3600 * 96));

  var last_query = getLastQuery();

  if(last_query.from === from.toISOString()) {
    to = new Date( (((new Date(last_query.to)).getTime() - from.getTime() ) / 2 )+from.getTime());
    console.log('Retry mode', to);
  }

  saveLastQuery({
    from:from,
    to:to
  })

  Client.once('saving job', (job) => {
    job.last_modified_date = to.toISOString();
  });

  return util.format(query, from.toNTREISString(), to.toNTREISString());
}

var lastFile = '/tmp/old_listings_last_query.json';
function getLastQuery() {
  try {
    var info = JSON.parse(fs.readFileSync(lastFile).toString());
    return info;
  } catch(e) {
    return {
      from:null,
      to:null
    }
  }
}

function saveLastQuery(last) {
  fs.writeFileSync(lastFile, JSON.stringify(last))
}