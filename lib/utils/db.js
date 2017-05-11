const config = require('../config.js')
const pg = require('pg')
const fs = require('fs')
const promisify = require('../utils/promisify')

const debug = require('debug')('rechat:db:inspect')
const profiler = require('debug')('rechat:db:profile')

pg.defaults.poolSize = config.pg.pool_size

require('../models/Error.js')

function getConnection (cb) {
  pg.connect(config.pg.connection, cb)
}

function executeSql(sql, args, cb) {
  if (!process.domain) {
    console.log('No domain found while executing', sql, args)
    console.trace()
  }

  const client = process.domain.db

  if (!process.domain.query_count)
    process.domain.query_count = 0

  process.domain.query_count++

  client.query(sql, args, (err, res) => {
    debug(JSON.stringify({
      query: sql,
      params: args,
      error: err,
      res: res ? res.rows : null
    }))

    if (err) {
      let sanitized_sql = sql.replace(/[\n\t\r]/g, ' ')
      sanitized_sql = sanitized_sql.replace(/\s\s+/g, ' ')
      err.sql = sanitized_sql
      err.database_message = err.message
      
      return cb(Error.Database(err))
    }

    return cb(null, res)
  })
}

function query(name, args, cb) {
  Metric.increment('query:' + name)

  if (!process.domain) {
    console.log('No domain found on query()', name, args)
    console.trace()
  }

  getQuery(name, (err, sql) => {
    if (err)
      return cb(err)

    const s = new Date().getTime()
    executeSql(sql, args, (err, result) => {
      const e = new Date().getTime()
      profiler('⌚', '\t' + name + '\t\t\t' + (e - s) + 'ms')
      cb(err, result)
    })
  })
}

query.promise = promisify(query)

const cache = {}
function getQuery(name, cb) {
  if (cache[name])
    return cb(null, cache[name])

  fs.readFile('lib/sql/' + name + '.sql', (err, buffer) => {
    if (err)
      return cb(err)

    const sql = buffer.toString()

    if (process.NODE_ENV === 'production')
      cache[name] = sql

    cb(null, sql)
  })
}

module.exports = {
  pg: pg,
  config: config.pg,
  conn: getConnection,
  query,
  executeSql
}
