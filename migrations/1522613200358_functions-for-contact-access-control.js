'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const read_access = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/read_access.fn.sql', 'utf-8')
const write_access = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/write_access.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  read_access,
  write_access,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION check_contact_read_access(contacts, uuid)',
  'DROP FUNCTION check_contact_write_access(contacts, uuid)',
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
