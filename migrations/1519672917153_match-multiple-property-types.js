'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brokerwolf_property_types ADD property_types deal_property_type[]',
  'UPDATE brokerwolf_property_types SET property_types = ARRAY[property_type]',
  'UPDATE brokerwolf_property_types SET property_types = NULL WHERE property_types = \'{Null}\'',
  'ALTER TABLE brokerwolf_property_types DROP property_type',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brokerwolf_property_types DROP property_types',
  'ALTER TABLE brokerwolf_property_types ADD property_type deal_property_type',
  'COMMIT'
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
