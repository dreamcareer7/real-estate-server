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
  'WITH tan AS (\
    SELECT id FROM notifications WHERE subject_class = \'Task\' OR object_class = \'Task\' OR auxiliary_object_class = \'Task\' OR auxiliary_subject_class = \'Task\'\
  ),\
  trn AS (\
    SELECT id FROM notifications WHERE subject_class = \'Transaction\' OR object_class = \'Transaction\' OR auxiliary_object_class = \'Transaction\' OR auxiliary_subject_class = \'Transaction\'\
  ),\
  r1 AS (\
    DELETE FROM messages WHERE notification IN (SELECT id FROM tan)\
  ),\
  r2 AS (\
    DELETE FROM messages WHERE notification IN (SELECT id FROM trn)\
  ),\
  r3 AS (\
    DELETE FROM notifications_users WHERE notification IN (SELECT id FROM tan)\
  ),\
  r4 AS (\
    DELETE FROM notifications_users WHERE notification IN (SELECT id FROM trn)\
  ),\
  r5 AS (\
    DELETE FROM notifications_deliveries WHERE notification IN (SELECT id FROM tan)\
  ),\
  r6 AS (\
    DELETE FROM notifications_deliveries WHERE notification IN (SELECT id FROM trn)\
  ),\
  r7 AS (\
    DELETE FROM notifications_acks WHERE notification IN (SELECT id FROM tan)\
  ),\
  r8 AS (\
    DELETE FROM notifications_acks WHERE notification IN (SELECT id FROM trn)\
  ),\
  r9 AS (\
    DELETE FROM notifications WHERE id IN (SELECT id FROM tan)\
  ),\
  r10 AS (\
    DELETE FROM notifications WHERE id IN (SELECT id FROM trn)\
  )\
  SELECT now()\
  '
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
