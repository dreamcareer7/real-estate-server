#!/usr/bin/env node

var Client = require('./rets_client.js');

var program = require('./program.js')
var options = program.parse(process.argv);

options.resource = 'Agent';
options.class = 'Agent';

Client.work(options, report);

function report() {
  process.exit();
}