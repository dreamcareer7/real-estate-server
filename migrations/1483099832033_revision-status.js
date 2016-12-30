'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE form_revision_status AS ENUM (
    'Draft',
    'Fair'
   )`,
  'ALTER TABLE forms_data ADD state form_revision_status NOT NULL DEFAULT \'Draft\'',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TYPE form_revision_status',
  'ALTER TABLE forms_data DROP state',
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
