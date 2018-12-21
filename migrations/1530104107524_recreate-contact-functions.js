'use strict'

const fs = require('fs')
const path = require('path')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = path.resolve(__dirname, '../lib/sql/contact/functions')
const fn_source = fn_name => fs.readFileSync(path.resolve(sql_path, fn_name + '.fn.sql'), 'utf-8')

const read_access = fn_source('read_access')
const write_access = fn_source('write_access')

const up = [
  'BEGIN',
  'DROP FUNCTION check_contact_read_access(contacts, uuid)',
  read_access,
  'DROP FUNCTION check_contact_write_access(contacts, uuid)',
  write_access,
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
