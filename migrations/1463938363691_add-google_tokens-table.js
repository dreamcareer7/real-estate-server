'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE public.google_tokens(\
  id uuid NOT NULL DEFAULT uuid_generate_v1(),\
  access_token character varying,\
  refresh_token character varying,\
  created_at timestamp with time zone DEFAULT now(),\
  expiry_date timestamp with time zone,\
  "user" uuid,\
  calendar_id character varying,\
  sync_token character varying);'
]

const down = ['DROP TABLE public.google_tokens;']

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
