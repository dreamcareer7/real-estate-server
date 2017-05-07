'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE property_units ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE property_units ALTER COLUMN updated_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE reviews ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
  'ALTER TABLE reviews_history ALTER COLUMN created_at SET DEFAULT CLOCK_TIMESTAMP()',
]

const down = [
  'ALTER TABLE property_units ALTER COLUMN created_at SET DEFAULT NOW()',
  'ALTER TABLE property_units ALTER COLUMN updated_at SET DEFAULT NOW()',
  'ALTER TABLE reviews ALTER COLUMN created_at SET DEFAULT NOW()',
  'ALTER TABLE reviews_history ALTER COLUMN created_at SET DEFAULT NOW()',
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
