'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE INDEX ON agents (regexp_replace(mlsid, \'^0*\', \'\', \'g\'))'
]

const down = [
  'DROP INDEX agents_regexp_replace_idx'
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
