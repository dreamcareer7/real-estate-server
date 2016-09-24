'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE brands (id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, created_at timestamp with time zone DEFAULT NOW(), updated_at timestamp with time zone DEFAULT NOW(), title text, subdomain text, logo_url text, palette jsonb )'
]

const down = [
  'DROP TABLE brands'
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
