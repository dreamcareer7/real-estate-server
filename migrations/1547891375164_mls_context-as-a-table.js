'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_mls_context = fs.readFileSync(__dirname + '/../lib/sql/deal/context/get_mls_context.fn.sql', 'utf-8')
const update_current_deal_context_fn = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.fn.sql', 'utf-8')
const update_current_deal_context_trigger = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.trigger.sql', 'utf-8')

const up = [
  'BEGIN',
  'ALTER TYPE mls_context ALTER ATTRIBUTE date SET DATA TYPE timestamp with time zone',
  'TRUNCATE TABLE current_deal_context',
  'ALTER TABLE current_deal_context DROP CONSTRAINT new_deal_context_pkey',
  'ALTER TABLE current_deal_context ALTER id DROP NOT NULL',
  'ALTER TABLE current_deal_context ADD source deal_context_source NOT NULL',
  'ALTER TABLE current_deal_context ADD definition uuid REFERENCES brands_contexts(id) NOT NULL',
  get_mls_context,
  update_current_deal_context_fn,
  update_current_deal_context_trigger,
  'SELECT update_current_deal_context(id) FROM deals',
  'COMMIT'
]

const down = [
]

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
