'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE cmas DROP COLUMN median_price;',
  'ALTER TABLE cmas DROP COLUMN median_dom;',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE cmas ADD median_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_dom int NOT NULL DEFAULT 0;',
  'COMMIT'
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
