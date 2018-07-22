'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE template_type
   AS ENUM('ListingPostcard')`,
  `CREATE TABLE templates (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    name TEXT NOT NULL,
    ratio FLOAT,
    brand uuid NOT NULL,
    template TEXT NOT NULL,
    template_type template_type NOT NULL
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE templates',
  'DROP TYPE template_type',
  'COMMIT'
]

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
