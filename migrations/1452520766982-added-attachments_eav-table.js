'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE attachments_eav (id uuid default uuid_generate_v4(), object uuid NOT NULL, attachment uuid NOT NULL REFERENCES attachments(id));',
  'ALTER TABLE attachments_eav ADD UNIQUE(object, attachment);'
]

const down = [
  'DROP TABLE attachments_eav;'
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
