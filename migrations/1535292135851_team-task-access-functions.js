'use strict'

const path = require('path')
const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = fn => path.resolve(__dirname, '../lib/sql/crm/task', fn + '.fn.sql')
const source = fn => fs.readFileSync(sql_path(fn), 'utf-8')

const check_task_read_access = source('read_access')
const check_task_write_access = source('write_access')

const up = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS check_task_read_access(uuid, uuid)',
  check_task_read_access,
  'DROP FUNCTION IF EXISTS check_task_write_access(uuid, uuid)',
  check_task_write_access,
  'COMMIT'
]

const down = [
]

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
