'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_files_by_role = fs.readFileSync(__dirname + '/../lib/sql/file/get_files_by_role.fn.sql', 'utf-8')

const up = [
  get_files_by_role,
]

const down = [
  'DROP FUNCTION get_files_by_role',
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
