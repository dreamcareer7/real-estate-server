'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'DO $$ BEGIN ALTER TABLE contacts ADD COLUMN profile_image_url text; EXCEPTION WHEN duplicate_column THEN END; $$;';
var sql_down = 'ALTER TABLE contacts DROP COLUMN IF EXISTS profile_image_url;';

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
