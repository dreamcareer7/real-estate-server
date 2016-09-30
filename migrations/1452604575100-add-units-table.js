'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['CREATE TABLE public.units(\
    id uuid NOT NULL DEFAULT uuid_generate_v1(),\
  dining_length integer,\
  dining_width integer,\
  kitchen_length integer,\
  kitchen_width integer,\
  lease integer,\
  listing uuid,\
  listing_mui bigint,\
  living_length integer,\
  living_width integer,\
  master_length integer,\
  master_width integer,\
  matrix_unique_id bigint,\
  matrix_modified_dt timestamp with time zone,\
  full_bath integer,\
  half_bath integer,\
  beds integer,\
  units integer,\
  square_meters integer,\
  created_at timestamp with time zone DEFAULT now(),\
  updated_at timestamp with time zone DEFAULT now());'
]

const down = ['DROP TABLE IF EXISTS units;']

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
