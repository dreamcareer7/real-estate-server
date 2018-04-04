'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `ALTER TYPE deal_role
    ADD VALUE 'BuyerPowerOfAttorney'`,

  `ALTER TYPE deal_role
    ADD VALUE 'SellerPowerOfAttorney'`,

  `ALTER TYPE deal_role
    ADD VALUE 'LandlordPowerOfAttorney'`,

  `ALTER TYPE deal_role
    ADD VALUE 'TenantPowerOfAttorney'`
]

const down = []

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
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
