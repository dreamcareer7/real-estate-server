'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE OR REPLACE FUNCTION wipe_everything() RETURNS VOID AS $$\
BEGIN\
    TRUNCATE TABLE messages_acks CASCADE;\
    TRUNCATE TABLE messages CASCADE;\
    TRUNCATE TABLE notifications_acks CASCADE;\
    TRUNCATE TABLE notifications CASCADE;\
    TRUNCATE TABLE recommendations_eav CASCADE;\
    TRUNCATE TABLE recommendations CASCADE;\
    TRUNCATE TABLE rooms_users CASCADE;\
    TRUNCATE TABLE rooms CASCADE;\
    TRUNCATE TABLE invitation_records CASCADE;\
    TRUNCATE TABLE alerts CASCADE;\
    TRUNCATE TABLE contacts CASCADE;\
    TRUNCATE TABLE notification_tokens CASCADE;\
    TRUNCATE TABLE password_recovery_records CASCADE;\
    TRUNCATE TABLE email_verifications CASCADE;\
    TRUNCATE TABLE phone_verifications CASCADE;\
END;\
$$ LANGUAGE plpgsql;';

var sql_down = 'DROP FUNCTION wipe_everything();';

var runSql = (sql) => {
  return (next) => {
    db.conn( (err, client) => {
      if(err)
        return next(err);

      return client.query(sql, next);
    });
  };
};

exports.up = runSql(sql_up);
exports.down = runSql(sql_down);
