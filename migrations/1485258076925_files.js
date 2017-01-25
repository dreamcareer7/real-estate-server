'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE files (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    deleted_at timestamp with time zone,
    created_by uuid NOT NULL REFERENCES users(id),
    url TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE files_relations (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    deleted_at timestamp with time zone,
    file uuid NOT NULL REFERENCES files(id),
    role TEXT NOT NULL,
    role_id uuid NOT NULL
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE files',
  'DROP TABLE files_relations',
  'COMMIT'
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
