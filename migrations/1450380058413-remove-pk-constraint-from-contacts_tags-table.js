'use strict';

var db = require('../lib/utils/db');

var sql_up = 'ALTER TABLE contacts_tags DROP CONSTRAINT IF EXISTS contacts_tags_pkey;';
var sql_down   = 'ALTER TABLE contacts_tags ADD CONSTRAINT contacts_tags_pkey PRIMARY KEY(id);';

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
