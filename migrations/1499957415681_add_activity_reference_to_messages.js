'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE activities ADD PRIMARY KEY(id)',
  'ALTER TABLE messages ADD activity uuid REFERENCES activities(id)'
]

const down = [
  'ALTER TABLE messages DROP COLUMN activity',
  'ALTER TABLE activities DROP CONSTRAINT activities_pkey'
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
