'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DELETE FROM crm_associations WHERE touch = ANY(select id from touches WHERE description IS NULL)',
  'delete from touches where description is null',
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
    deleted_at IS NULL
    AND touches.description IS NOT NULL`,
  'DELETE FROM crm_associations WHERE touch = ANY(SELECT id FROM touches WHERE deleted_at IS NOT NULL)',
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
