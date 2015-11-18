'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TRIGGER toggle_phone_confirmed\
                AFTER UPDATE ON users\
                FOR EACH ROW\
                WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)\
                EXECUTE PROCEDURE toggle_phone_confirmed();';

var sql_down = 'DROP TRIGGER toggle_phone_confirmed ON users;';

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
