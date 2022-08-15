const config = require('../config.js')
const pg = require('pg')
const fs = require('fs')
const range = require('postgres-range')
const _ = require('lodash')
const promisify = require('../utils/promisify')
const Context = require('../models/Context')

const Metric = require('../models/Metric')

require('../models/Error.js')

// Set type parser for int4range type until node-pg-type does a major release
pg.types.setTypeParser(3904, function(val) {
  return range.parse(val, num => parseInt(num, 10))
})
pg.types.setTypeParser(1700, function(val) {
  return parseFloat(val)
})

const pool = new pg.Pool({
  max: config.pg.pool_size,
  connectionString: config.pg.connection,
  connectionTimeoutMillis: config.pg.connection_timeout,
  ssl: {
    rejectUnauthorized: false
  }
})

/**
 * 
 * @param {((err: Error) => void) & ((err: undefined, conn: import('pg').PoolClient, done: (release?: any) => void) => void)} cb 
 */
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

  const {
    totalCount,
    idleCount,
    waitingCount
  } = pool

  if (Context.get('db:log'))
    Context.log('Acquiring database connection', totalCount, idleCount, waitingCount)

  pool.connect((err, conn, _done) => {
    if (err) {
      Context.log('✖ DB Connection')
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

    const done = (release) => {
      if (Context.get('db:log'))
        Context.log('Connection released 👌')
      clearInterval(interval)
      _done.apply(conn, [release])
    }

    const id = Context.getId() || ''

    conn.query(`SET application_name = '${id}'`, (err) => {
      if (err) {
        done()
        return cb(err)
      }

      cb(undefined, conn, done)
    })
  })
}

/** @returns {Promise<{ conn: import('pg').PoolClient; done: (release?: any) => void; }>} */
getConnection.promise = () => {
  return new Promise((resolve, reject) => {
    getConnection((err, conn, done) => {
      if (err)
        return reject(err)

      resolve({
        conn,
        done
      })
    })
  })
}

/**
 * @param {import('pg').Client=} client 
 */
function cancelActiveQuery(client) {
  if (!client) {
    client = Context.get('db')
  }
  if (!client) {
    throw new Error('Client not provided.')
  }

  if (client.activeQuery) {
    const newClient = new pg.Client({
      connectionString: config.pg.connection,
      connectionTimeoutMillis: config.pg.connection_timeout
    })
    newClient.cancel(client, client.activeQuery)
    Context.log('Sent a request to cancel active postgres query')
  }
}

/**
 * @template TRes
 * @param {string} sql 
 * @param {any[]=} args 
 * @param {import('pg').PoolClient?} client 
 * @param {((err: Error) => void) & ((err: null, res: import('pg').QueryResult<TRes>) => void)} cb 
 */
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

  const queryCb = (err, res) => {
    if (err) {
      let sanitized_sql = sql.replace(/[\n\t\r]/g, ' ')
      sanitized_sql = sanitized_sql.replace(/\s\s+/g, ' ')
      err.sql = sanitized_sql
      err.database_message = err.message

      // console.error(err)

      return cb(Error.Database(err))
    }

    return cb(null, res)
  }

  if (args)
    return client.query(sql, args, queryCb)

  return client.query(sql, queryCb)
}

/**
 * @template TRes
 * @param {string} sql 
 * @param {any[]=} args 
 * @param {import('pg').PoolClient?} client 
 * @returns {Promise<import('pg').QueryResult<TRes>>}
 */
executeSql.promise = (sql, args, client = null) => {
  return new Promise((resolve, reject) => {
    executeSql(sql, args, client, (err, res) => {
      if (err)
        return reject(err)

      resolve(res)
    })
  })
}

/**
 * Query wrapper that returns resulting rows
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} q Query path
 * @param {any[]=} args Query arguments
 * @param {import('pg').PoolClient=} client DB connection
 */
async function asyncQuery(q, args, client) {
  let name, sql
  if (typeof q === 'object') {
    // @ts-ignore
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
  const result = await executeSql.promise(sql, args, client)
  const e = new Date().getTime()

  if (logging)
    Context.log('✓', name)

  let query_elapsed = Context.get('query_elapsed') || 0
  query_elapsed += (e - s)
  Context.set({query_elapsed})

  Metric.increment('query', [`name:${name}`])
  Metric.increment('query.elapsed', [`name:${name}`])

  return result
}

/**
 * Query wrapper that returns resulting rows
 */
function query(q, args, client, cb) {
  if (!cb) {
    cb = client
    client = null
  }

  asyncQuery(q, args, client).nodeify(cb)
}

query.promise = asyncQuery

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
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 */
async function select(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rows
}

/**
 * Select wrapper that returns the returning ids
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
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
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
 * @param {any[]=} args Query arguments
 * @param {string | ((row) => any)} fn Map function or a field to pick
 * @param {any=} client DB connection
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
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 */
async function selectOne(name, args, client) {
  const result = await select(name, args, client)
  return result?.[0]
}

/**
 * Query wrapper that returns id from the returned row
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 * @returns {Promise<UUID>}
 */
async function selectId(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rows?.[0]?.id
}

/**
 * Chunk query payloads
 * @template T
 * @template R
 * @param {T[]} payload 
 * @param {number} parameterCount 
 * @param {(chunk: T[], i: number) => Promise<R[]>} chunkFn 
 */
async function chunked(payload, parameterCount, chunkFn) {
  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const res = await Promise.all(_.chunk(payload, Math.floor(LIBPQ_PARAMETER_LIMIT / (parameterCount + 1)))
    .map(chunkFn))

  return res.flat()
}

/**
 * Query wrapper for update command that returns number of affected rows
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name Query path
 * @param {any[]=} args Query arguments
 * @param {any=} client DB connection
 */
async function update(name, args, client) {
  const result = await query.promise(name, args, client)
  return result.rowCount
}

/**
 * Same as `select` but with a timeout
 * @param {TDbSqlAddress | import('@rechat/squel').QueryBuilder} name 
 * @param {any[]} args 
 * @param {number} ms
 */
async function timed(name, args, ms) {
  class QueryTimedOutException extends Error {}

  function timeout(ms) {
    return new Promise((res, rej) => {
      setTimeout(() => {
        rej(new QueryTimedOutException())
      }, ms)
    })
  }

  try {
    const result = await Promise.race([
      select(name, args),
      timeout(ms)
    ])

    return result
  } catch (ex) {
    if (ex instanceof QueryTimedOutException) {
      cancelActiveQuery()
    } else {
      throw ex
    }
  }
}

function enableLogging() {
  Context.set({'db:log': true })
}

module.exports = {
  conn: getConnection,
  cancelActiveQuery,
  query,
  select,
  selectIds,
  map,
  timed,
  selectOne,
  selectId,
  insert: selectId,
  chunked,
  update,
  executeSql,
  enableLogging,
  close() {
    return pool.end()
  }
}
