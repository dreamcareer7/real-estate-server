'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/contact')
const clear_is_primary_on_other_attrs = fs.readFileSync(sql_path + '/triggers/clear_is_primary_on_other_attrs.fn.sql', 'utf-8')
const fix_is_primary_on_attr_insert_or_update = fs.readFileSync(sql_path + '/triggers/fix_is_primary_on_attr_insert_or_update.trigger.sql', 'utf-8')

const up = [
  'BEGIN',
  clear_is_primary_on_other_attrs,
  fix_is_primary_on_attr_insert_or_update,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TRIGGER fix_is_primary_on_attr_insert_or_update ON contacts_attributes',
  'DROP FUNCTION clear_is_primary_on_other_attrs',
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
