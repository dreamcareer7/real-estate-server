'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE brands_checklists_allowed_forms (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    checklist uuid NOT NULL REFERENCES brands_checklists(id),
    form uuid NOT NULL REFERENCES forms(id)
  )`,
  'ALTER TABLE deals_checklists ADD origin uuid REFERENCES brands_checklists(id)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE brands_checklists_allowed_forms',
  'ALTER TABLE deals_checklists DROP origin',
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
