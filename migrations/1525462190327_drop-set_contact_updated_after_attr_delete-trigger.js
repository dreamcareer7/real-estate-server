'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/contact')
const set_contact_updated_after_attr_delete_fn = fs.readFileSync(sql_path + '/triggers/set_contact_updated_after_attr_delete.fn.sql', 'utf-8')
const set_contact_updated_after_attr_delete_trigger = fs.readFileSync(sql_path + '/triggers/set_contact_updated_after_attr_delete.trigger.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP TRIGGER set_contact_updated_after_attr_delete ON contacts_attributes',
  'DROP FUNCTION set_contact_updated_after_attr_delete',
  'COMMIT'
]

const down = [
  'BEGIN',
  set_contact_updated_after_attr_delete_fn,
  set_contact_updated_after_attr_delete_trigger,
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
