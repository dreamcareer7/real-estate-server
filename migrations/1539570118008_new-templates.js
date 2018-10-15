'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brands_forms_templates DROP CONSTRAINT brands_forms_templates_brand_form',
  'ALTER TABLE brands_forms_templates ADD deal_types deal_type[]',
  'ALTER TABLE brands_forms_templates ADD property_types deal_property_type[]',
  'ALTER TABLE brands_forms_templates ADD name TEXT NOT NULL',
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
