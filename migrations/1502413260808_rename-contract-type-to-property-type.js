'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TYPE contract_type RENAME TO deal_property_type',
  'ALTER TABLE brands_checklists RENAME COLUMN contract_type TO property_type',
  'ALTER TABLE deals RENAME COLUMN contract_type TO property_type'
]

const down = [
  'ALTER TYPE deal_property_type RENAME TO contract_type',
  'ALTER TABLE brands_checklists RENAME COLUMN property_type TO contract_type',
  'ALTER TABLE deals RENAME COLUMN property_type TO contract_type'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
