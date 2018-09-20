'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO
    crm_tasks
      (
        id,
        created_at,
        updated_at,
        created_by,
        title,
        description,
        due_date,
        status,
        task_type,
        brand
      )
  SELECT
    id,
    created_at,
    updated_at,
    created_by,
    description AS title,
    NULL::text AS description,
    timestamp,
    'DONE' AS status,
    activity_type AS task_type,
    brand
  FROM
    touches
  WHERE
    deleted_at IS NULL`,
  `UPDATE 
    crm_associations
  SET
    crm_task = touch,
    touch = NULL
  WHERE
    touch IS NOT NULL
  `,
  'DROP TABLE touches CASCADe',
  'COMMIT'
]

const down = [
  'BEGIN',
  'UNDO SOMETHING',
  'UNDO SOMETHING ELSE',
  'UNDO EVEN MORE',
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
