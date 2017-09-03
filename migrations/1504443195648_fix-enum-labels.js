'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',

  `UPDATE pg_enum
   SET enumlabel = 'Commercial Sale'
   WHERE
    enumlabel = 'Commerical Sale'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'deal_property_type'
  )`,

  `UPDATE pg_enum
   SET enumlabel = 'Commercial Lease'
   WHERE
    enumlabel = 'Commerical Lease'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'deal_property_type'
  )`,

  'COMMIT'
]

const down = [
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
