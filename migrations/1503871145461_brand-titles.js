'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands ADD title TEXT',
  `UPDATE brands
    SET title = messages->>'site_title'`,
  `UPDATE brands
    SET title = 'Unnamed' WHERE title = '' OR title IS NULL`,
  'ALTER TABLE brands ALTER title SET NOT NULL',
  'COMMIT'
]

const down = [
  'ALTER TABLE brands DROP title'
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
