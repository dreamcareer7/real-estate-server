'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'CREATE TYPE room_notification_settings AS ENUM(\'N_ALL\', \'N_MENTIONS\', \'N_NONE\')',
  'ALTER TABLE rooms_users DROP COLUMN IF EXISTS push_enabled',
  'ALTER TABLE rooms_users ADD notification_setting room_notification_settings DEFAULT \'N_ALL\'',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE rooms_users DROP COLUMN IF EXISTS notification_setting',
  'ALTER TABLE rooms_users ADD push_enabled boolean DEFAULT true',
  'DROP TYPE IF EXISTS room_notification_settings',
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
