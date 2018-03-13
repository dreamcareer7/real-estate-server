'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE VIEW role_files AS
    SELECT
      files_relations.file as id,
      files_relations.role,
      files_relations.role_id
    FROM files_relations
    JOIN files
      ON files_relations.file = files.id
    WHERE
      files.deleted_at IS NULL
      AND files_relations.deleted_at IS NULL`
]

const down = [
  'DROP VIEW role_files'
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
