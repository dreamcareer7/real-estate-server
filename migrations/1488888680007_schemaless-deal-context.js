'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE deals ADD context JSONB DEFAULT \'{}\'',
  'UPDATE deals SET context = JSON_BUILD_OBJECT(\'deal_type\', deal_type, \'full_address\', address)',
  'ALTER TABLE deals DROP deal_type',
  'ALTER TABLE deals DROP address',
  'ALTER TABLE deals DROP transaction_type',
  'ALTER TABLE deals DROP property_type',
  'ALTER TABLE deals DROP year_built',
  'ALTER TABLE deals DROP mls_number',
  'ALTER TABLE deals DROP mls_area_major',
  'ALTER TABLE deals DROP mls_area_minor',
  'ALTER TABLE deals DROP list_price',
  'ALTER TABLE deals DROP list_date',
  'ALTER TABLE deals DROP expiration_date',
  'ALTER TABLE deals DROP executed_date',
  'ALTER TABLE deals DROP option_period_end_date',
  'ALTER TABLE deals DROP contingency_end_date',
  'ALTER TABLE deals DROP closing_date',
  'ALTER TABLE deals DROP move_in_date',
  'ALTER TABLE deals DROP lease_executed_date',
  'ALTER TABLE deals DROP seller_names',
  'ALTER TABLE deals DROP buyer_names',
  'ALTER TABLE deals DROP co_listing_agent',
  'ALTER TABLE deals DROP additional_notes',
  'ALTER TABLE deals DROP city',
  'ALTER TABLE deals DROP county',
  'ALTER TABLE deals DROP postal_code',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deals DROP context',
  'ALTER TABLE deals ADD transaction_type TEXT',
  'ALTER TABLE deals ADD property_type property_type',
  'ALTER TABLE deals ADD year_built smallint',
  'ALTER TABLE deals ADD mls_number text',
  'ALTER TABLE deals ADD mls_area_major text',
  'ALTER TABLE deals ADD mls_area_minor text',
  'ALTER TABLE deals ADD list_price double precision',
  'ALTER TABLE deals ADD list_date timestamp with time zone',
  'ALTER TABLE deals ADD expiration_date timestamp with time zone',
  'ALTER TABLE deals ADD executed_date timestamp with time zone',
  'ALTER TABLE deals ADD option_period_end_date timestamp with time zone',
  'ALTER TABLE deals ADD contingency_end_date timestamp with time zone',
  'ALTER TABLE deals ADD closing_date timestamp with time zone',
  'ALTER TABLE deals ADD move_in_date timestamp with time zone',
  'ALTER TABLE deals ADD lease_executed_date timestamp with time zone',
  'ALTER TABLE deals ADD seller_names text',
  'ALTER TABLE deals ADD buyer_names text',
  'ALTER TABLE deals ADD co_listing_agent text',
  'ALTER TABLE deals ADD additional_notes text',
  'ALTER TABLE deals ADD city text',
  'ALTER TABLE deals ADD county text',
  'ALTER TABLE deals ADD postal_code text',
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
