'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const read_access = fs.readFileSync(__dirname + '/../lib/sql/crm/task/read_access.fn.sql', 'utf-8')
const write_access = fs.readFileSync(__dirname + '/../lib/sql/crm/task/write_access.fn.sql', 'utf-8')
const has_access = fs.readFileSync(__dirname + '/../lib/sql/crm/task/has_access.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  read_access,
  write_access,
  has_access,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION crm_tasks_has_access(uuid[], uuid)',
  'DROP FUNCTION check_task_read_access(crm_tasks, uuid)',
  'DROP FUNCTION check_task_write_access(crm_tasks, uuid)',
  'COMMIT'
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
