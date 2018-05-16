'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/contact')
const get_deals_with_contact = fs.readFileSync(sql_path + '/functions/get_deals_with_contact.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP FUNCTION get_deals_with_contact(uuid, uuid)',
  get_deals_with_contact,
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
