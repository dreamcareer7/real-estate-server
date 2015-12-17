'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'DROP INDEX IF EXISTS contacts_tags_contact_tag_idx;';
var sql_down = 'CREATE UNIQUE INDEX IF NOT EXISTS contacts_tags_contact_tag_idx on contacts_tags(contact, tag);';

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
