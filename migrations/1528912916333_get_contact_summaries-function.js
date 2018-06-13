'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_contact_summaries = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_summaries.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  get_contact_summaries,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_contact_summaries(uuid[])',
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
