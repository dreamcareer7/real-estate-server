'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TYPE tag_types ADD VALUE IF NOT EXISTS \'Contact\';',
  'ALTER TYPE tag_types ADD VALUE IF NOT EXISTS \'Room\';',
  'ALTER TYPE tag_types ADD VALUE IF NOT EXISTS \'Listing\';',
  'ALTER TYPE tag_types ADD VALUE IF NOT EXISTS \'User\';',
  'UPDATE tags SET "type" = \'Contact\' WHERE "type" = \'contact\';',
  'UPDATE tags SET "type" = \'Room\' WHERE "type" = \'room\';',
  'UPDATE tags SET "type" = \'Listing\' WHERE "type" = \'listing\';',
  'UPDATE tags SET "type" = \'User\' WHERE "type" = \'user\';'
]

const down = [
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
