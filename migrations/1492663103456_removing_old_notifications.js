'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'DROP TABLE IF EXISTS notifications_acks',
  `WITH p AS
   (
     SELECT id
     FROM notifications
     WHERE
     (
       (subject_class = 'Contact' AND action = 'CreatedFor' AND object_class = 'User') OR
       (subject_class = 'Listing' AND action = 'PriceDropped' AND object_class = 'Room') OR
       (subject_class = 'Listing' AND action = 'StatusChanged' AND object_class = 'Room') OR
       (subject_class = 'OpenHouse' AND action = 'Available' AND object_class = 'Listing') OR
       (subject_class = 'Listing' AND action = 'BecameAvailable' AND object_class = 'Room')
     )
   ),
   r1 AS
   (
     DELETE FROM notifications_deliveries
     WHERE notification IN (SELECT id FROM p)
   ),
   r2 AS
   (
     DELETE FROM notifications_users
     WHERE notification IN (SELECT id FROM p)
   ),
   r3 AS
   (
     DELETE FROM messages
     WHERE notification IN (SELECT id FROM p)
   ),
   r4 AS
   (
     DELETE FROM notifications WHERE id IN (SELECT id FROM p)
   )
   SELECT NOW()`
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
