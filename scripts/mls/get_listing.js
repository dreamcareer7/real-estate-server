#!/usr/bin/env node

var async   = require('async');
var util    = require('util');
var Client = require('./rets_client.js');

var program = require('./program.js')
  .option('--mui <n>', 'Get listing by its matrix unique id');

var options = program.parse(process.argv);

options.resource = 'Property';
options.class = 'Listing';
options.dontSave = true;
options.query = '(Matrix_Unique_ID=' + options.mui + ')';
Client.work(options, report);

function report(cb, results) {
  console.log(util.inspect(results))
  process.exit();
}
