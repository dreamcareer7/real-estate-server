'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE brands_checklists DROP flags',

  `CREATE TYPE contract_type AS ENUM (
    'Resale',
    'New Home',
    'Lot / Land',
    'Residential Lease',
    'Commercial Sale',
    'Commercial Lease'
   )`,

  'ALTER TABLE brands_checklists ADD deal_type deal_type',
  'ALTER TABLE brands_checklists ADD contract_type contract_type',
  'ALTER TABLE deals ADD contract_type contract_type NOT NULL',
  'ALTER TABLE deals ADD deal_type deal_type NOT NULL',
  'ALTER TABLE deals DROP flags',
  'DROP TYPE deal_flag'
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
