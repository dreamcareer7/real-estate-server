var merge = require('merge');

var base = require('./lib/configs/newrelic.js');

var env = process.env.NODE_ENV || 'development';
var environmental = require('./lib/configs/' + env + '.js').newrelic;

var config = merge.recursive(base, environmental);

exports.config = config;
