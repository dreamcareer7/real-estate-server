'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE templates_instances (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    created_at timestamp with time zone DEFAULT NOW(),
    template uuid NOT NULL REFERENCES templates(id),
    html TEXT NOT NULL,
    file uuid NOT NULL REFERENCES files(id),
    created_by uuid NOT NULL REFERENCES users(id)
  )`,
  `CREATE TABLE templates_instances_relations (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    instance uuid NOT NULL REFERENCES templates_instances(id),
    deal uuid REFERENCES deals(id),
    contact uuid REFERENCES contacts(id)
   )`,
  'COMMIT'
]

const down = [
  'DROP TABLE templates_instances_relations',
  'DROP TABLE templates_instances'
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
