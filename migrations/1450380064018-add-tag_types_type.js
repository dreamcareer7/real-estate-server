'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TYPE tag_types AS ENUM (\'contact\',\'room\', \'listing\', \'user\');';
var sql_down = 'DROP TYPE IF EXISTS tag_types';

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
