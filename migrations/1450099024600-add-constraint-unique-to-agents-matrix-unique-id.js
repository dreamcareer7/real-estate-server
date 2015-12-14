'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE agents ADD UNIQUE (matrix_unique_id)';
var sql_down = 'ALTER TABLE contacts_tags DROP CONSTRAINT agents_matrix_unique_id_key';

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
