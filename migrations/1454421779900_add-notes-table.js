'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE notes(\
  id uuid NOT NULL DEFAULT uuid_generate_v4(),\
  entity uuid NOT NULL,\
  \"user\" uuid NOT NULL,\
  note character varying NOT NULL,\
  type note_types,\
  created_at timestamp with time zone DEFAULT now())'
]

const down = ['DROP TABLE IF EXISTS notes;']

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
