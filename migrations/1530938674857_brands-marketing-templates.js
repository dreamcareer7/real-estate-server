'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE brand_marketing_template
   AS ENUM('ListingPostcard')`,
  `CREATE TABLE brands_marketing_templates (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    name TEXT NOT NULL,
    ratio SMALLINT,
    brand uuid NOT NULL,
    template TEXT NOT NULL,
    template_type brand_marketing_template NOT NULL
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TYPE brand_marketing_template',
  'DROP TABLE brand_marketing_templates',
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
