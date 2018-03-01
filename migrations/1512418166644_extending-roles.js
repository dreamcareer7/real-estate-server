'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `ALTER TYPE deal_role
    ADD VALUE 'SellerLawyer'`,
  `ALTER TYPE deal_role
    ADD VALUE 'BuyerLawyer'`,
  `ALTER TYPE deal_role
    ADD VALUE 'SellerReferral'`,
  `ALTER TYPE deal_role
    ADD VALUE 'BuyerReferral'`,
  'BEGIN',
  'ALTER TABLE deals_roles ADD legal_prefix TEXT',
  'ALTER TABLE deals_roles ADD legal_first_name TEXT',
  'ALTER TABLE deals_roles ADD legal_middle_name TEXT',
  'ALTER TABLE deals_roles ADD legal_last_name TEXT',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals_roles DROP legal_prefix',
  'ALTER TABLE deals_roles DROP legal_first_name',
  'ALTER TABLE deals_roles DROP legal_middle_name',
  'ALTER TABLE deals_roles DROP legal_last_name',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
