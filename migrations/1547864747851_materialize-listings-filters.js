'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const update_listings_filters_fn = fs.readFileSync(__dirname + '/../lib/sql/alert/update_listings_filters.fn.sql', 'utf-8')
const update_listings_filters_tr = fs.readFileSync(__dirname + '/../lib/sql/alert/update_listings_filters.trigger.sql', 'utf-8')


const up = [
  'BEGIN',
  'ALTER MATERIALIZED VIEW listings_filters RENAME TO old_listings_filters',

  'CREATE TABLE listings_filters AS SELECT * FROM old_listings_filters',

  'DROP MATERIALIZED VIEW old_listings_filters',

  'ALTER TABLE listings_filters ADD PRIMARY KEY(id)',
  'CREATE INDEX listings_filters_location ON listings_filters USING GIST (location)',
  'CREATE INDEX listings_filters_mls_area_major ON listings_filters(mls_area_major)',
  'CREATE INDEX listings_filters_mls_area_minor ON listings_filters(mls_area_minor)',
  'CREATE INDEX listings_filters_mls_number     ON listings_filters(mls_number)',
  'CREATE INDEX listings_filters_status         ON listings_filters(status)',
  'CREATE INDEX listings_filters_address_trgm   ON listings_filters USING gin (address gin_trgm_ops)',
  'CREATE INDEX listings_filters_status_order   ON listings_filters(order_listings(status))',
  'CREATE INDEX listings_filters_list_office    ON listings_filters(list_office_mls_id)',
  'CREATE INDEX listings_filters_list_agent     ON listings_filters(list_agent_mls_id)',
  'CREATE INDEX listings_filters_address        ON listings_filters USING GIN (to_tsvector(\'english\', address))',
  'CREATE INDEX listings_filters_price          ON listings_filters(price)',
  'CREATE INDEX listings_filters_close_price    ON listings_filters(close_price)',
  'CREATE INDEX listings_filters_architecture   ON listings_filters USING GIN (architectural_style)',

  update_listings_filters_fn,
  update_listings_filters_tr,

  'COMMIT'
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
