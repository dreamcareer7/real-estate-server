'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE websites_hostnames ADD CONSTRAINT websites_hostnames_key UNIQUE(hostname)'
]

const down = [
  'ALTER TABLE websites_hostnames DROP CONSTRAINT websites_hostnames_key'
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
