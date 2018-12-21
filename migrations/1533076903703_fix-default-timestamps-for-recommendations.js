'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE recommendations
    ALTER COLUMN created_at SET DEFAULT clock_timestamp(),
    ALTER COLUMN updated_at SET DEFAULT clock_timestamp()
  `,
  `UPDATE
    recommendations
  SET
    updated_at = xxx.updated_at
  FROM (
    SELECT
      id,
      updated_at + ((row_number()  over ()) || ' milliseconds')::interval AS updated_at
    FROM
      recommendations
    WHERE
      created_at > now() - interval '2 day'
  ) AS xxx
  WHERE
    recommendations.id = xxx.id`,
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
