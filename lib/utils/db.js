const config = require('../config.js')
const pg = require('pg')
const fs = require('fs')
const promisify = require('../utils/promisify')

const debug = require('debug')('rechat:db:inspect')
const profiler = require('debug')('rechat:db:profile')
const Metric = require('../models/Metric')

require('../models/Error.js')

const pool = new pg.Pool({
  max: config.pg.pool_size,
  connectionString: config.pg.connection,
  connectionTimeoutMillis: config.pg.connection_timeout
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
    return cb(Error.Generic({
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
    }))

  if (!process.domain.query_count)
    process.domain.query_count = 0

  process.domain.query_count++

  client.rechat_last_query = sql
  client.rechat_query_done = false
  client.stack_trace = JSON.stringify((new Error).stack)

  client.query(sql, args, (err, res) => {
    client.rechat_query_done = true

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

async function asyncQuery(q, args, client) {
  let name, sql
  if (typeof q === 'object') {
    name = q.name
    const built = q.toParam()
    args = built.values
    sql = built.text
  }
  else {
    name = q
    sql = await promisify(getQuery)(name)
  }

  if (!process.domain.query_elapsed)
    process.domain.query_elapsed = 0

  const id = process.domain.req ? `\t ${process.domain.req.rechat_id}` : ''

  Metric.increment('query:' + name)

  if (!process.domain && !client) {
    throw Error.Generic({
      message: 'No domain found on query()',
      name
    })
  }

  const s = new Date().getTime()
  const result = await promisify(executeSql)(sql, args, client)
  const e = new Date().getTime()

  profiler(id, '\t' + name + '\t\t\t' + (e - s) + 'ms')
  process.domain.query_elapsed += (e - s)
  return result
}

function query(q, args, client, cb) {
  if (!cb) {
    cb = client
    client = null
  }

  asyncQuery(q, args, client).nodeify(cb)
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

/**
 * Query wrapper that returns resulting rows
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<any[]>}
 */
async function select(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rows
}

/**
 * Select wrapper that returns the returning ids
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<UUID[]>}
 */
async function selectIds(name, args, client) {
  const rows = await select(name, args, client)
  return rows.map(row => row.id)
}

/**
 * Select wrapper that returns the first row
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 */
async function selectOne(name, args, client) {
  const result = await select(name, args, client)
  return result[0]
}

/**
 * Query wrapper that returns id of the inserted row
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<UUID>}
 */
async function insert(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rows[0].id
}

/**
 * Query wrapper for update command that returns number of affected rows
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<number>}
 */
async function update(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rowCount
}

module.exports = {
  conn: getConnection,
  query,
  select,
  selectIds,
  selectOne,
  insert,
  update,
  executeSql
}
