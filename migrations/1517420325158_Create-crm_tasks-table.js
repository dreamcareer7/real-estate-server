'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE IF NOT EXISTS crm_tasks (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz,
    deleted_at timestamptz,
    created_by uuid REFERENCES users(id),

    title TEXT,
    description TEXT,
    due_date timestamptz,
    status TEXT DEFAULT 'PENDING',
    task_type TEXT,

    assignee uuid NOT NULL REFERENCES users(id),
    contact uuid REFERENCES contacts(id),
    deal uuid REFERENCES deals(id),
    listing uuid REFERENCES listings(id)
  )`
]

const down = [
  'DROP TABLE IF EXISTS crm_tasks'
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
