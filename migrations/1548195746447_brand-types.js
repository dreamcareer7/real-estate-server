'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE brand_type AS ENUM(
    'Brokerage',
    'Office',
    'Team',
    'Personal',
    'Other'
  )`,
  'ALTER TABLE brands ADD brand_type brand_type',
  `UPDATE brands
    SET brand_type = 'Other'`,
  'ALTER TABLE brands ALTER brand_type SET NOT NULL',
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
