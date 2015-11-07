'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE invitation_records DROP CONSTRAINT invitation_records_invited_user_room_key;';
var sql_down = 'ALTER TABLE invitation_records ADD UNIQUE(invited_user, room);';

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
