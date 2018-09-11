'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE crm_tasks_assignees (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_task uuid NOT NULL REFERENCES crm_tasks (id),
    "user" uuid NOT NULL REFERENCES users (id),
    created_by uuid NOT NULL REFERENCES users (id),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    deleted_by REFERENCES users (id)
  )`,
  `INSERT INTO crm_tasks_assignees
    (crm_task, "user", created_by, created_at)
  SELECT
    id, created_by, created_by, created_at
  FROM
    crm_tasks
  WHERE
    deleted_at IS NULL`,
  'CREATE INDEX crm_tasks_assignees_user_idx ON crm_tasks_assignees USING hash ("user")',
  'CREATE INDEX crm_tasks_assignees_task_idx ON crm_tasks_assignees USING hash (crm_task)',
  // 'ALTER TABLE crm_tasks DROP COLUMN assignee',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE crm_tasks_assignees',
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
