'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE deal_context_type AS ENUM(
    'Text', 'Date', 'Number'
   )`,
  'ALTER TABLE deal_context ADD context_type deal_context_type',
  'ALTER TABLE deal_context ADD text TEXT',
  'ALTER TABLE deal_context ADD number FLOAT',
  'ALTER TABLE deal_context ADD date TIMESTAMP WITH TIME ZONE',
  'ALTER TABLE deal_context ADD revision uuid REFERENCES forms_data(id)',
  'ALTER TABLE deal_context ADD approved boolean NOT NULL DEFAULT FALSE',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE deal_context DROP text',
  'ALTER TABLE deal_context DROP number',
  'ALTER TABLE deal_context DROP date',
  'ALTER TABLE deal_context DROP revision',
  'ALTER TABLE deal_context DROP approved',
  'ALTER TABLE deal_context DROP context_type',
  'DROP TYPE deal_context_type',
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
