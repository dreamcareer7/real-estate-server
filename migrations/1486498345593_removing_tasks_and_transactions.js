'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'DROP TABLE IF EXISTS important_dates',
  'DROP TABLE IF EXISTS task_contacts',
  'DROP TABLE IF EXISTS tasks',
  'DROP TABLE IF EXISTS transaction_contact_roles',
  'DROP TABLE IF EXISTS transaction_contacts',
  'DROP TABLE IF EXISTS transactions',
  'DROP TABLE IF EXISTS notes',
  'DELETE FROM notifications WHERE subject_class = \'Task\' OR object_class = \'Task\' OR auxiliary_object_class = \'Task\' OR auxiliary_subject_class = \'Task\'',
  'DELETE FROM notifications WHERE subject_class = \'Transaction\' OR object_class = \'Transaction\' OR auxiliary_object_class = \'Transaction\' OR auxiliary_subject_class = \'Transaction\''
]

const down = [
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
