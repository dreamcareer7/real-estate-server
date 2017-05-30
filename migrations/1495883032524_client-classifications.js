'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TYPE client_type',
  'CREATE TYPE client_type AS ENUM(\'Web\', \'Mobile\')',
  'ALTER TABLE clients ADD client_type client_type NOT NULL DEFAULT \'Mobile\'',
  'ALTER TABLE clients ALTER COLUMN client_type DROP DEFAULT',
  'COMMIT'
]

const down = [
  'ALTER TABLE clients DROP client_type',
  'DROP TYPE client_type'
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
