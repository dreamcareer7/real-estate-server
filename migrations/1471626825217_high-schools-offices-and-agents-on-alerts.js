'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE alerts ADD offices text[]',
  'ALTER TABLE alerts ADD agents text[]',
  'ALTER TABLE alerts ADD high_schools text[]'
]

const down = [
  'ALTER TABLE alerts DROP offices',
  'ALTER TABLE alerts DROP agents',
  'ALTER TABLE alerts DROP high_schools'
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
