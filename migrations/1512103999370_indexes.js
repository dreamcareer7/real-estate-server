'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE INDEX files_relations_role_id ON files_relations(role_id)',
  'CREATE INDEX files_relations_role ON files_relations(role)',
  'CREATE INDEX forms_data_submission ON forms_data(submission)',
  'CREATE INDEX tasks_checklist ON tasks(checklist)'
]

const down = [
  'DROP INDEX files_relations_role_id',
  'DROP INDEX files_relations_role',
  'DROP INDEX forms_data_submission',
  'DROP INDEX tasks_checklist'
]

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
