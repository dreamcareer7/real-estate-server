'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE brands_checklists DROP flags',

  `CREATE TYPE contract_type AS ENUM (
    'Traditional Sale',
    'Condo',
    'New Build',
    'Farm & Ranch'
   )`,

  'ALTER TABLE brands_checklists ADD listing_type property_type NOT NULL',
  'ALTER TABLE brands_checklists ADD contract_type contract_type',
]




const down = []

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
