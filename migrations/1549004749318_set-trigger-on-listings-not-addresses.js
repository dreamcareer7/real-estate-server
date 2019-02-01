'use strict'

const async = require('async')
const fs = require('fs')

const db = require('../lib/utils/db')

const trigger = fs.readFileSync(__dirname + '/../lib/sql/alert/update_listings_filters.trigger.sql', 'utf-8')
const fn = fs.readFileSync(__dirname + '/../lib/sql/alert/update_listings_filters.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP TRIGGER IF EXISTS update_listings_filters ON addresses',
  trigger,
  fn,
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
