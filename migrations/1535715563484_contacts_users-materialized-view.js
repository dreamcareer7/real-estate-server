'use strict'

const path = require('path')
const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = p => path.resolve(__dirname, '../lib/sql/contact', p)
const source = p => fs.readFileSync(sql_path(p), 'utf-8')

const up = [
  'BEGIN',
  source('views/contacts_users.mv.sql'),
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP MATERIALIZED VIEW IF EXISTS contacts_users',
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
