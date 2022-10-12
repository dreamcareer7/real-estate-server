const db = require('./db')
const { NotFound } = require('../models/SupportBot/errors')
const _ = require('lodash')

async function selectWithError(sql, args) {
  const result = await db.executeSql.promise(sql, args)

  if (result.rows.length < 1) {
    throw new NotFound('No records found.')
  }

  return result.rows
}

/**
 * @template R
 * @returns {Promise<R[]>}
 */
async function query(sql, args) {
  const result = await db.executeSql.promise(sql, args)

  return result.rows
}

/**
 * @template R
 * @returns {Promise<R>}
 */
async function selectOne(sql, args) {
  /** @type {R[]} */
  const rows = await query(sql, args)

  return rows[0]
}

/**
 * @template R
 * @template M
 * @returns {Promise<M[]>}
 */
async function map(sql, args, fn) {
  /** @type {R[]} */
  const rows = await query(sql, args)

  if (typeof fn === 'function') {
    return rows.map(fn)
  }
  
  if (typeof fn === 'string') {
    return rows.map(/** @returns {M} */r => r[fn])
  }

  if (Array.isArray(fn)) {
    return rows.map(r => /** @type {M} */(_.pick(r, fn)))
  }

  throw new Error('sql.map(): Unknown mapping argument.')
}

/**
 * @returns {Promise<string[]>}
 */
async function selectIds(sql, args) {
  return map(sql, args, 'id')
}

async function selectId(sql, args) {
  const ids = await selectIds(sql, args)

  return ids[0]
}

/** @returns {Promise<number>} */
async function update(sql, args) {
  const result = await db.executeSql.promise(sql, args)

  return result.rowCount
}

module.exports = {
  query,
  select: query,
  selectWithError,
  selectOne,
  selectIds,
  selectId,
  map,
  update
}
