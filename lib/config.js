const merge = require('merge')

const base = require('./configs/base.js')

const env = process.env.NODE_ENV || 'development'
const environmental = require('./configs/' + env + '.js')

const config = merge.recursive(base, environmental)   

console.log('db-conn:', config.pg.connection);

module.exports = config
