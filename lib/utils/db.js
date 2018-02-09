const config = require('../config.js')
const pg = require('pg')
const fs = require('fs')
const promisify = require('../utils/promisify')

const debug = require('debug')('rechat:db:inspect')
const profiler = require('debug')('rechat:db:profile')
require('../models/Error.js')

const pool = new pg.Pool({
  max: config.pg.pool_size,
  connectionString: config.pg.connection
})

function getConnection (cb) {
  pool.connect(cb)
}

function executeSql(sql, args, client, cb) {
  if (!cb) {
    cb = client
    client = null
  }

  if (!client)
    client = process.domain.db

  if (!process.domain && !client) {
    console.log('No domain found while executing', sql, args)
    console.trace()
  }

  if (!client)
    throw Error.Generic({
      message: 'Domain has no client connection. Maybe it was rollbacked already?',
      query: sql,
      /*
       * So if there's a request that is rolled back (due to an error or something)
       * it's normal for it not to have db anymore as the transaction is closed.
       *
       * But if the domain is _not_ handled and there's no connection, something is wrong,
       * we need to know it.
       */
      slack: !(process.domain && process.domain.rolled_back)
    })

  if (!process.domain.query_count)
    process.domain.query_count = 0

  process.domain.query_count++

  client.rechat_last_query = sql
  client.stack_trace = JSON.stringify((new Error).stack)

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

function query(name, args, client, cb) {
  const id = process.domain.req ? `\t ${process.domain.req.rechat_id}` : ''

  profiler('①', id, '\t' + name)

  if (!cb) {
    cb = client
    client = null
  }

  Metric.increment('query:' + name)

  if (!process.domain && !client) {
    return cb(new Error.Generic({
      message: 'No domain found on query()',
      name
    }))
  }

  getQuery(name, (err, sql) => {
    if (err)
      return cb(err)

    const s = new Date().getTime()

    profiler('②', id, '\t' + name)
    executeSql(sql, args, client, (err, result) => {
      const e = new Date().getTime()

      profiler('③', id, '\t' + name + '\t\t\t' + (e - s) + 'ms')
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

    if (process.env.NODE_ENV === 'production')
      cache[name] = sql

    cb(null, sql)
  })
}

module.exports = {
  conn: getConnection,
  query,
  executeSql
}
