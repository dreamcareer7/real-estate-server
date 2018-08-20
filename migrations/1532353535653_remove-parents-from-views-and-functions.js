'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/contact/functions')
const sql_file = name => fs.readFileSync(path.resolve(sql_path, name + '.fn.sql'), 'utf-8')

const read_access = sql_file('read_access')
const write_access = sql_file('write_access')

const up = [
  'BEGIN',
  'DROP VIEW joined_contacts',
  'ALTER TABLE contacts DROP COLUMN parent',
  read_access,
  write_access,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN parent uuid REFERENCES contacts(id)',
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
