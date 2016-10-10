'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DELETE FROM messages WHERE notification IN (SELECT id FROM notifications WHERE object_class = \'CMA\');',
  'DELETE FROM notifications WHERE object_class = \'CMA\';',
  'DELETE FROM cmas;',
  'ALTER TABLE cmas ADD main_listing uuid NOT NULL REFERENCES listings(id);',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE cmas DROP COLUMN main_listing;',
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
