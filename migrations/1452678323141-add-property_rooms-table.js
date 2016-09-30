'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['CREATE TABLE property_rooms(\
  id uuid NOT NULL DEFAULT uuid_generate_v1(),\
  matrix_unique_id bigint,\
  matrix_modified_dt timestamp with time zone,\
  description text,\
  length int,\
  width int,\
  features text,\
  listing_mui bigint,\
  listing uuid,\
  level int,\
  type text,\
  created_at timestamp with time zone,\
  updated_at timestamp with time zone)'
]

const down = ['DROP TABLE IF EXISTS property_rooms;']

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
