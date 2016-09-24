'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'UPDATE tasks SET private = false WHERE private IS NULL;',
  'ALTER TABLE tasks ALTER COLUMN private SET NOT NULL;',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE tasks ALTER COLUMN private DROP NOT NULL;',
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
