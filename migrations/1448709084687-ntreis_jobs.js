'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE ntreis_jobs (\
    id uuid DEFAULT uuid_generate_v1(),\
    created_at timestamp with time zone DEFAULT now(),\
    last_modified_date timestamp without time zone,\
    last_id bigint,\
    results integer,\
    query text,\
    is_initial_completed boolean DEFAULT false\
)'

const sql_down = 'DROP TABLE IF EXISTS ntreis_jobs'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up)
exports.down = runSql(sql_down)
