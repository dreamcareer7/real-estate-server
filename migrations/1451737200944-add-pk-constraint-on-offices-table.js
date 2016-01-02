'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE offices ADD CONSTRAINT offices_pkey PRIMARY KEY(id);';
var sql_down = 'ALTER TABLE offices DROP CONSTRAINT offices_pkey;';

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
