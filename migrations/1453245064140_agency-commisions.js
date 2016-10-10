'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE listings ADD COLUMN buyers_agency_commission text',
  'ALTER TABLE listings ADD COLUMN sub_agency_commission    text'
]

const down = [
  'ALTER TABLE listings DROP COLUMN buyers_agency_commission',
  'ALTER TABLE listings DROP COLUMN sub_agency_commission'
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
