#!/usr/bin/env node

var Client = require('./rets_client.js');
var colors = require('colors');
var exit   = require('./exit.js');

var program = require('./program.js')
var options = program.parse(process.argv);

options.resource = 'Media';
options.class = 'Media';

Client.work(options, report);


function report() {
  console.log('>>', arguments);
}