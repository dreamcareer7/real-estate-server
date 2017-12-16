'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE deals_roles ADD
    commission_percentage SMALLINT
    CHECK(commission_percentage > 0 AND commission_percentage < 100)`,
  'ALTER TABLE deals_roles RENAME commission TO commission_dollar',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP commission_percentage',
  'ALTER TABLE deals_roles RENAME commission_dollar TO commission',
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
