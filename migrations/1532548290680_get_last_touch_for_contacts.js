'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/crm/touch/get_last_touch_for_contacts.fn.sql')
const get_last_touch_for_contacts = fs.readFileSync(sql_path, 'utf-8')

const up = [
  'BEGIN',
  get_last_touch_for_contacts,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_last_touch_for_contacts(uuid[])',
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
