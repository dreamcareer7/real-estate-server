var merge = require('merge');

var base = require('./configs/base.js');

var env = process.env.NODE_ENV || 'development';
var enviromental = require('./configs/'+env+'.js');

var config = merge.recursive(base, enviromental);

module.exports = config;