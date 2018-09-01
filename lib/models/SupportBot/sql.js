const db = require('../../utils/db.js')
const { NotFound } = require('./errors')
const _ = require('lodash')

async function select(sql, args) {
  const result = await db.executeSql.promise(sql, args)

  if (result.rows.length < 1) {
    throw new NotFound
  }

  return result.rows
}

async function selectOne(sql, args) {
  const rows = await select(sql, args)

  return rows[0]
}

async function map(sql, args, fn) {
  const rows = await select(sql, args)

  if (typeof fn === 'function') {
    return rows.map(fn)
  }
  
  if (typeof fn === 'string') {
    return rows.map(r => r[fn])
  }

  if (Array.isArray(fn)) {
    return rows.map(r => _.pick(r, fn))
  }
}

async function selectIds(sql, args) {
  return map(sql, args, 'id')
}

async function selectId(sql, args) {
  const ids = await selectIds(sql, args)

  return ids[0]
}

async function update(sql, args) {
  const result = await db.executeSql.promise(sql, args)

  return result.affectedRows
}

module.exports = {
  select,
  selectOne,
  selectIds,
  selectId,
  map,
  update
}