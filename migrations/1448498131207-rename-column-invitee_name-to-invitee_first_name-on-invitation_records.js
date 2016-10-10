'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE invitation_records RENAME COLUMN invitee_name TO invitee_first_name;'
const sql_down = 'ALTER TABLE invitation_records RENAME COLUMN invitee_first_name TO invitee_name;'

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
