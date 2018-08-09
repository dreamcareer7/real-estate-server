'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/contact/list/create_stage_lists_for_user.fn.sql')
const create_stage_lists_for_user = fs.readFileSync(sql_path, 'utf-8')

const up = [
  'BEGIN',
  create_stage_lists_for_user,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION create_stage_lists_for_user(uuid)',
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
