'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'INSERT INTO tags(name) VALUES\
  (\'buyer\'),\
  (\'seller\'),\
(\'rental and lease\'),\
  (\'investor\'),\
  (\'broker and agent\'),\
  (\'vendors\'),\
  (\'home inspector\'),\
  (\'lender\'),\
  (\'title company\'),\
  (\'lawyer\'),\
  (\'contractor\'),\
  (\'appraisal\');';

var sql_down = 'DELETE FROM tags';

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
