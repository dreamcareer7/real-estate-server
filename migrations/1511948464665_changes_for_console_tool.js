'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id)',
  'ALTER TABLE clients ALTER COLUMN id SET DEFAULT uuid_generate_v1()',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE clients DROP CONSTRAINT clients_pkey',
  'ALTER TABLE clients ALTER COLUMN id DROP DEFAULT',
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
