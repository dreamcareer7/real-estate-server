'use strict'

const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const merge_contacts = fs.readFileSync(
  __dirname + '/../lib/sql/contact/functions/merge_contacts.fn.sql',
  'utf-8'
)

const up = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS merge_contacts(uuid, uuid[])',
  merge_contacts,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION merge_contacts(uuid, uuid[])',
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
