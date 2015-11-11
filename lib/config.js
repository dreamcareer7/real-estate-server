var merge = require('merge');

var base = require('./configs/base.js');

var env = process.env.NODE_ENV || 'development';
var environmental = require('./configs/' + env + '.js');

var config = merge.recursive(base, environmental);

module.exports = config;
