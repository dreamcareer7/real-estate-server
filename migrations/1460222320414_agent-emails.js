'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var create = "CREATE MATERIALIZED VIEW agents_emails AS ( \
  WITH stated_emails AS ( \
    SELECT matrix_unique_id as mui, email, matrix_modified_dt as date \
    FROM agents \
    WHERE email <> '' \
  ), \
  \
  list_agents AS (\
    SELECT\
      list_agent_mui as mui, list_agent_email as email, list_date as date\
    FROM listings\
    WHERE\
      list_agent_email <> ''\
  ),\
  \
  co_list_agents AS (\
    SELECT\
      co_list_agent_mui as mui, co_list_agent_email as email, list_date as date\
    FROM listings\
    WHERE\
      co_list_agent_email <> ''\
  ),\
  \
  selling_agents AS (\
    SELECT\
      selling_agent_mui as mui, selling_agent_email as email, list_date as date\
    FROM listings\
    WHERE\
      selling_agent_email <> ''\
  ),\
  \
  co_selling_agents AS (\
    SELECT\
      co_selling_agent_mui as mui, co_selling_agent_email as email, list_date as date\
    FROM listings\
    WHERE\
      co_selling_agent_email <> ''\
  )\
  \
  SELECT * FROM stated_emails\
  UNION\
  SELECT * FROM list_agents\
  UNION\
  SELECT * FROM co_list_agents\
  UNION\
  SELECT * FROM selling_agents\
  UNION\
  SELECT * FROM co_selling_agents\
)";

var up = [
  'BEGIN',
  create,
  'CREATE INDEX agents_emails_mui ON agents_emails (mui)',
  'COMMIT'
];

var down = [
  'DROP MATERIALIZED VIEW agents_emails'
];

var runAll = (sqls, next) => {
  db.conn( (err, client) => {
    if(err)
      return next(err);

    async.eachSeries(sqls, client.query.bind(client), next);
  });
};

var run = (queries) => {
  return (next) => {
    runAll(queries, next);
  };
};

exports.up = run(up);
exports.down = run(down);
