'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['CREATE TABLE transaction_contact_roles(\
    id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  transaction_contact uuid NOT NULL,\
  role character varying NOT NULL,\
  created_at timestamp with time zone DEFAULT now())'
]

const down = ['DROP TABLE IF EXISTS transaction_contact_roles;']

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
