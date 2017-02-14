'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE contacts ADD ios_address_book_id uuid',
  'ALTER TABLE contacts ADD android_address_book_id uuid'
]

const down = [
  'ALTER TABLE contacts DROP COLUMN ios_address_book_id',
  'ALTER TABLE contacts DROP COLUMN android_address_book_id'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
