'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE attachments ADD private boolean DEFAULT false;',
  'ALTER TABLE attachments ADD attributes jsonb;',
  'ALTER TABLE tasks ADD private boolean DEFAULT false;'
]

const down = [
  'ALTER TABLE attachments DROP COLUMN private;',
  'ALTER TABLE attachments DROP COLUMN attributes;',
  'ALTER TABLE task DROP COLUMN private;'
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
