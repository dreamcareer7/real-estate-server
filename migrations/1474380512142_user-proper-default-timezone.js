'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE users ALTER timezone SET DEFAULT \'America/Chicago\'',
  'UPDATE users SET timezone = \'America/Chicago\' WHERE timezone = \'CST\''
]

const down = [
  'ALTER TABLE users ALTER timezone SET DEFAULT \'CST\''
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
