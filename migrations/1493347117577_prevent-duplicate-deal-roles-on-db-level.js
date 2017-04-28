'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `WITH a AS (
      SELECT array_agg(id) as ids, (deal || role::text || "user") as identifier FROM deals_roles GROUP BY identifier HAVING count(*) > 1
    ),

    b AS (
      SELECT unnest(ids) as id FROM a
    ),

    keep as (
      SELECT unnest(ids[0:1]) as id, identifier FROM a
    )

  DELETE FROM deals_roles WHERE id IN(SELECT id FROM b) AND id NOT IN (SELECT id FROM keep)`,
  'ALTER TABLE deals_roles ADD CONSTRAINT deals_roles_unique UNIQUE(deal, role, "user")',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP CONSTRAINT deals_roles_unique',
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
