'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'UPDATE alerts SET open_house = FALSE;',
  'ALTER TABLE alerts ALTER COLUMN open_house SET NOT NULL;'
]

const down = [
  'ALTER TABLE alerts ALTER COLUMN open_house DROP NOT NULL;'
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
