#!/usr/bin/env node

var async   = require('async');
var Client = require('./rets_client.js');

var program = require('./program.js')
var options = program.parse(process.argv);


options.resource = 'Agent';
options.class = 'Agent';
options.processor = processData;

Client.work(options, report);

function processData(cb, results) {
  async.mapLimit(results.mls, 100, insertAgent, cb);
}

function insertAgent(photo, cb) {
  Client.increment('processed_agent');
  Agent.create({
    matrix_unique_id:parseInt(photo.matrix_unique_id),
    listing_mui:parseInt(photo.Table_MUI),
    description:photo.Description,
    order:parseInt(photo.Order)
  }, cb);
}

function report(err) {
  console.log('Exiting', err);
  process.exit();
}