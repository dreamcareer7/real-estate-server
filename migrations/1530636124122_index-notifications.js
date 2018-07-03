'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'CREATE INDEX notifications_subject_class ON notifications(subject_class)',
  'CREATE INDEX notifications_object_class ON notifications(object_class)',
  'CREATE INDEX notifications_auxiliary_object_class ON notifications(auxiliary_object_class)',
  'CREATE INDEX notifications_auxiliary_subject_class ON notifications(auxiliary_subject_class)',
  'CREATE INDEX notifications_extra_object_class ON notifications(extra_object_class)',
  'CREATE INDEX notifications_extra_subject_class ON notifications(extra_subject_class)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP INDEX notifications_subject_class',
  'DROP INDEX notifications_object_class',
  'DROP INDEX notifications_auxiliary_object_class',
  'DROP INDEX notifications_auxiliary_subject_class',
  'DROP INDEX notifications_extra_object_class',
  'DROP INDEX notifications_extra_subject_class',
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
