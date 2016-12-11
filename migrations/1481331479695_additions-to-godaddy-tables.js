'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE godaddy_shoppers ADD email TEXT NOT NULL',
  'ALTER TABLE godaddy_shoppers ADD password TEXT NOT NULL',
  'ALTER TABLE godaddy_domains  ADD hosted_zone TEXT',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE godaddy_shoppers DROP email',
  'ALTER TABLE godaddy_shoppers DROP password',
  'ALTER TABLE godaddy_domains  DROP hosted_zone',
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
