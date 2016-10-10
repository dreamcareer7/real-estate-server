'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts ADD COLUMN property_types property_type[]',
  'UPDATE alerts a SET property_types = ARRAY[(SELECT property_type FROM alerts WHERE id = a.id)]',
  'ALTER TABLE alerts DROP COLUMN property_type'
]

const down = [
  'ALTER TABLE alerts DROP COLUMN property_types',
  'ALTER TABLE alerts ADD COLUMN property_type property_type'
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
