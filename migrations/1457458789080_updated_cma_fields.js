'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE cmas ADD lowest_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD average_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD highest_price float NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD lowest_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD median_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD average_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ADD highest_dom int NOT NULL DEFAULT 0;',
  'ALTER TABLE cmas ALTER COLUMN suggested_price DROP NOT NULL;',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE cmas DROP COLUMN lowest_price;',
  'ALTER TABLE cmas DROP COLUMN median_price;',
  'ALTER TABLE cmas DROP COLUMN average_price;',
  'ALTER TABLE cmas DROP COLUMN highest_price;',
  'ALTER TABLE cmas DROP COLUMN lowest_dom;',
  'ALTER TABLE cmas DROP COLUMN median_dom;',
  'ALTER TABLE cmas DROP COLUMN average_dom;',
  'ALTER TABLE cmas DROP COLUMN highest_dom;',
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
