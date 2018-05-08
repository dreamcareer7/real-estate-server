'use strict'

const async = require('async')
const path = require('path')
const fs = require('fs')
const db = require('../lib/utils/db')

const fn_path = path.resolve.bind(path, __dirname, '..', 'lib/sql/contact/functions')

const delete_contact_attribute_def = fs.readFileSync(fn_path('delete_contact_attribute_def.fn.sql'), 'utf-8')

const up = [
  'BEGIN',
  delete_contact_attribute_def,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION delete_contact_attribute_def(uuid)',
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
