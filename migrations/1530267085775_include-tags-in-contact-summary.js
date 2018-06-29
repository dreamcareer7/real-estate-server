'use strict'

const fs = require('fs')
const path = require('path')
const async = require('async')
const db = require('../lib/utils/db')

const fn_source = fn_name => fs.readFileSync(path.resolve(__dirname, '../lib/sql/contact/functions', fn_name + '.fn.sql'), 'utf-8')
const get_contact_summaries = fn_source('get_contact_summaries')

const up = [
  'BEGIN',
  'DROP FUNCTION get_contact_summaries(uuid[])',
  get_contact_summaries,
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
