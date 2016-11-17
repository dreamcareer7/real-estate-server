'use strict'

const async = require('async')
const db = require('../lib/utils/db')


const up = [
  'BEGIN',
  'DROP TABLE websites_hostnames',
  'DROP TABLE websites',
  `CREATE TABLE websites (
    id uuid NOT NUlL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "user" uuid NOT NULL REFERENCES users(id)
  )`,
  `CREATE TABLE websites_snapshots (
    id uuid NOT NUlL DEFAULT uuid_generate_v1() PRIMARY KEY,
    website uuid NOT NULL REFERENCES websites(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand uuid REFERENCES brands(id),
    template TEXT,
    attributes jsonb
  )`,
  `CREATE TABLE websites_hostnames (
    id uuid NOT NULL DEFAULT uuid_generate_v1(),
    website uuid NOT NULL REFERENCES websites(id),
    hostname TEXT, "default" BOOLEAN  NOT NULL DEFAULT FALSE
  )`,
  'COMMIT'
]

const down = []

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
