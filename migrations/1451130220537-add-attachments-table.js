'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TABLE IF NOT EXISTS attachments(id uuid default uuid_generate_v4() PRIMARY KEY, \
"user" uuid not null references users(id), url text, metadata jsonb, \
created_at timestamptz default NOW(), updated_at timestamptz default NOW(), deleted_at timestamptz);';
var sql_down = 'DROP TABLE attachments;';

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
