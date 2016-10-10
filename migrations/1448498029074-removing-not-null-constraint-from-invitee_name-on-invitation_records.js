'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE invitation_records ALTER COLUMN invitee_name DROP NOT NULL;'
const sql_down = 'ALTER TABLE invitation_records ALTER COLUMN invitee_name SET NOT NULL;'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up)
exports.down = runSql(sql_down)
