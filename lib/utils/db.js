const config = require('../config.js')
const pg = require('pg')
const fs = require('fs')
const _ = require('lodash')
const promisify = require('../utils/promisify')
const Context = require('../models/Context')

const Metric = require('../models/Metric')

require('../models/Error.js')

const pool = new pg.Pool({
  max: config.pg.pool_size,
  connectionString: config.pg.connection,
  connectionTimeoutMillis: config.pg.connection_timeout
})

function getConnection (cb) {
  const activeContext = Context.getActive()

  if (Context.get('db:log')) {
    if (activeContext && activeContext.elapsed() > 2 * 60 * 1000) {
      Context.trace('🕑 DB Connection')
    }
    else {
      Context.log('🕑 DB Connection')
    }
  }

  pool.connect((err, conn, _done) => {
    if (err) {
      Context.log('✖ DB Connection')
      Context.log('Acquiting database connection')
      return cb(err)
    }

    if (Context.get('db:log'))
      Context.log('✓ DB Connection')

    const log = () => {
      if (Context.get('db:log')) {
        Context.log('Connection not released')
      }
    }

    const interval = setInterval(log, 30 * 1000)

    const done = (...args) => {
      if (Context.get('db:log'))
        Context.log('Connection released 👌')
      clearInterval(interval)
      _done.apply(conn, args)
    }

    cb(null, conn, done)
  })
}

getConnection.promise = promisify(getConnection)

function executeSql(sql, args, client, cb) {
  if (!cb) {
    cb = client
    client = null
  }

  const context = Context.getActive()

  if (!client)
    client = context.get('db')

  if (!context && !client) {
    context.trace('No context found while executing', sql, args)
  }

  if (!client)
    return cb(Error.Generic({
      message: 'Context has no client connection. Maybe it was rollbacked already?',
      query: sql,
      slack: false
    }))

  if (context) {
    let query_count = context.get('query_count') || 0
    query_count++
    context.set({query_count})
  }

  client.query(sql, args, (err, res) => {
    if (err) {
      // console.error(err)

      let sanitized_sql = sql.replace(/[\n\t\r]/g, ' ')
      sanitized_sql = sanitized_sql.replace(/\s\s+/g, ' ')
      err.sql = sanitized_sql
      err.database_message = err.message

      console.log(err.internalQuery)

      return cb(Error.Database(err))
    }

    return cb(null, res)
  })
}

executeSql.promise = (sql, args, client = null) => {
  return new Promise((resolve, reject) => {
    executeSql(sql, args, client, (err, res) => {
      if (err)
        return reject(err)

      resolve(res)
    })
  })
}

async function asyncQuery(q, args, client) {
  let name, sql
  if (typeof q === 'object') {
    name = q.name
    const built = q.toParam()
    if (!args || args.length === 0) {
      args = built.values
    }
    sql = built.text
  }
  else {
    name = q
    sql = await promisify(getQuery)(name)
  }

  Metric.increment('query:' + name)

  if (!Context.getActive() && !client) {
    throw Error.Generic({
      message: 'No context found on query()',
      name
    })
  }

  const logging = Context.get('db:log')

  if (logging)
    Context.log('🕑', name)

  const s = new Date().getTime()
  const result = await promisify(executeSql)(sql, args, client)
  const e = new Date().getTime()

  if (logging)
    Context.log('✓', name)

  let query_elapsed = Context.get('query_elapsed') || 0
  query_elapsed += (e - s)
  Context.set({query_elapsed})

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
 * Select wrapper that maps the results
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {string | ((row) => any)} fn Map function or a field to pick
 * @param {any=} client DB connection
 * @returns {Promise<any[]>}
 */
async function map(name, args, fn, client) {
  const rows = await select(name, args, client)

  if (typeof fn === 'string') {
    return rows.map((row => row[fn]))
  }

  return rows.map(fn)
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
 * Query wrapper that returns id from the returned row
 * @param {String | Object} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<UUID>}
 */
async function selectId(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rows[0].id
}

/**
 * Chunk query payloads
 * @param {any[]} payload 
 * @param {number} parameterCount 
 * @param {(any, number) => Promise<any>} chunkFn 
 */
async function chunked(payload, parameterCount, chunkFn) {
  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const res = await Promise.all(_.chunk(payload, Math.floor(LIBPQ_PARAMETER_LIMIT / parameterCount))
    .map(chunkFn))

  return _.flatten(res)
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
  map,
  selectOne,
  selectId,
  insert: selectId,
  chunked,
  update,
  executeSql,
  close() {
    return pool.end()
  }
}
