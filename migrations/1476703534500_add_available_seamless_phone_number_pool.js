'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE seamless_phone_pool(id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY, phone_number text NOT NULL, enabled boolean DEFAULT TRUE);',
  'ALTER TABLE rooms_users ADD phone_handler uuid REFERENCES seamless_phone_pool(id);'
]

const down = [
  'DROP TABLE seamless_phone_pool;',
  'ALTER TABLE rooms_users DROP COLUMN phone_handler;'
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
