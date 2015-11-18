'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE OR REPLACE FUNCTION toggle_phone_confirmed() RETURNS TRIGGER AS $toggle_phone_confirmed$\
                BEGIN\
                UPDATE users\
                SET phone_confirmed = false\
                WHERE id = NEW.id;\
                RETURN NEW;\
                END;\
                $toggle_phone_confirmed$ language plpgsql;';

var sql_down = 'DROP FUNCTION toggle_phone_confirmed();';

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
