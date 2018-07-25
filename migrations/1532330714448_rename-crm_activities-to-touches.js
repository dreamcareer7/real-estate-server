'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE crm_activities RENAME TO touches',
  'ALTER FUNCTION check_crm_activity_read_access RENAME TO check_touch_read_access',
  'ALTER FUNCTION check_crm_activity_write_access RENAME TO check_touch_write_access',
  'ALTER TABLE crm_associations RENAME COLUMN crm_activity TO touch',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_associations RENAME COLUMN crm_activity TO touch',
  'ALTER FUNCTION check_touch_read_access RENAME TO check_crm_activity_read_access',
  'ALTER FUNCTION check_touch_write_access RENAME TO check_crm_activity_write_access',
  'ALTER TABLE touches RENAME TO crm_activities',
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
