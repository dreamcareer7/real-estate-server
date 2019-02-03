'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE deals_checklists SET faired_at = (
    SELECT faired_at FROM deals WHERE deals.id = deals_checklists.deal
   )`,
   // TODO: Abbas djaan can you update the analytics view in here?
   'ALTER TABLE deals DROP faired_at',
  'COMMIT'
]

const down = []

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
