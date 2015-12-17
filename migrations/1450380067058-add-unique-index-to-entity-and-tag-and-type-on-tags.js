'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE UNIQUE INDEX IF NOT EXISTS tags_entity_tag_type_idx on tags(contact, tag, type);';
var sql_down = 'DROP INDEX IF EXISTS tags_entity_tag_type_idx;';

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
