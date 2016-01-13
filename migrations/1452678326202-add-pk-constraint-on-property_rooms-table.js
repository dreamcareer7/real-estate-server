'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE property_rooms ADD CONSTRAINT property_rooms_pkey PRIMARY KEY(id);';
var sql_down = 'ALTER TABLE units DROP CONSTRAINT property_rooms;';

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
