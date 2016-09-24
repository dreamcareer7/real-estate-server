'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE invitation_records DROP CONSTRAINT invitation_records_invited_user_room_key;'
const sql_down = 'ALTER TABLE invitation_records ADD CONSTRAINT rooms_invitation_records_invited_user_room_key UNIQUE(invited_user, room);'

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
