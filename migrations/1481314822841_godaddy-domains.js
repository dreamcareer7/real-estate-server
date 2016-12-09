'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE godaddy_domains(
    id uuid NOT NULL DEfAULT uuid_generate_v1(),
    name TEXT UNIQUE,
    created_at timestamp with time zone default NOW(),
    updated_at timestamp with time zone default NOW(),
    owner uuid REFERENCES users(id),
    order_id INT
  )`
]

const down = [
  'DROP TABLE godaddy_domains'
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
