'use strict';

var db = require('../lib/utils/db');

var sql_up  = 'DROP TABLE IF EXISTS tags;';
var sql_down = 'CREATE TABLE IF NOT EXISTS tags(\
  id uuid DEFAULT uuid_generate_v1(),\
  name character varying(100));';

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
