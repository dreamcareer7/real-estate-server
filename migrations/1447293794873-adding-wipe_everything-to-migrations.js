'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE OR REPLACE FUNCTION wipe_everything() RETURNS VOID AS $$\
BEGIN\
    TRUNCATE TABLE logs CASCADE;\
    TRUNCATE TABLE messages_acks CASCADE;\
    TRUNCATE TABLE messages CASCADE;\
    TRUNCATE TABLE notifications_acks CASCADE;\
    TRUNCATE TABLE notifications CASCADE;\
    TRUNCATE TABLE recommendations_eav CASCADE;\
    TRUNCATE TABLE recommendations CASCADE;\
    TRUNCATE TABLE rooms_users CASCADE;\
    TRUNCATE TABLE rooms CASCADE;\
    TRUNCATE TABLE invitation_records CASCADE;\
    TRUNCATE TABLE notifications CASCADE;\
    TRUNCATE TABLE alerts CASCADE;\
    TRUNCATE TABLE contacts CASCADE;\
    TRUNCATE TABLE notification_tokens CASCADE;\
    TRUNCATE TABLE password_recovery_records CASCADE;\
    TRUNCATE TABLE tokens CASCADE;\
END;\
$$ LANGUAGE plpgsql;'

const sql_down = 'DROP FUNCTION wipe_everything();'

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
