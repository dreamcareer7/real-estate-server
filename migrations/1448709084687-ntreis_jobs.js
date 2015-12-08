'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TABLE ntreis_jobs (\
    id uuid DEFAULT uuid_generate_v1(),\
    created_at timestamp with time zone DEFAULT now(),\
    last_modified_date timestamp without time zone,\
    last_id bigint,\
    results integer,\
    query text,\
    is_initial_completed boolean DEFAULT false\
)';

var sql_down = 'DROP TABLE IF EXISTS ntreis_jobs';

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
