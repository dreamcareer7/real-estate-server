'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE units ADD CONSTRAINT units_pkey PRIMARY KEY(id);';
var sql_down = 'ALTER TABLE units DROP CONSTRAINT units_pkey;';

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
