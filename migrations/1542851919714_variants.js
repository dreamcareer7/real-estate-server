'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE templates DROP CONSTRAINT template_name_type',
  'ALTER TABLE templates ADD variant TEXT',
  'ALTER TABLE templates ADD CONSTRAINT template_variant UNIQUE(name, variant)',
  'ALTER TABLE templates DROP COLUMN template',
  'ALTER TABLE templates DROP COLUMN thumbnail',
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
