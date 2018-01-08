'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP CONSTRAINT deals_roles_commission_percentage_check',
  `ALTER TABLE deals_roles ADD CONSTRAINT deals_roles_commission_percentage_check
    CHECK(commission_percentage >= 0 AND commission_percentage <= 100)`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP CONSTRAINT deals_roles_commission_percentage_check',
  `ALTER TABLE deals_roles ADD CONSTRAINT deals_roles_commission_percentage_check
    CHECK(commission_percentage > 0 AND commission_percentage < 100)`,
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
