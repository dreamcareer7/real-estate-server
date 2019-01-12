'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_mls_context = fs.readFileSync(__dirname + '/../lib/sql/deal/context/get_mls_context.fn.sql', 'utf-8')
const update = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.fn.sql', 'utf-8')

const up = [
  'ALTER TYPE deal_context_type RENAME TO context_data_type',
  'ALTER TABLE deal_context RENAME context_type TO data_type',
  'ALTER TABLE current_deal_context RENAME context_type TO data_type',
  update,
  `CREATE TYPE mls_context AS
    (
      data_type context_data_type,
      key TEXT,
      text TEXT,
      number numeric,
      date numeric,
      listing uuid
    )`,
  get_mls_context
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
