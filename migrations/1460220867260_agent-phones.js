'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const create = 'CREATE MATERIALIZED VIEW agents_phones AS ( \
  WITH stated_phones AS ( \
    SELECT (\'phone_number_\' || id) as id, matrix_unique_id as mui, phone_number as phone, matrix_modified_dt as date \
    FROM agents \
    WHERE phone_number <> \'\' \
  ), \
  \
  stated_work_phones AS (\
    SELECT (\'work_phone\' || id) as id, matrix_unique_id as mui, work_phone as phone, matrix_modified_dt as date\
    FROM agents\
    WHERE work_phone <> \'\'\
  ),\
  \
  list_agents AS (\
    SELECT\
      (\'list_agents_\' || id) as id, list_agent_mui as mui, list_agent_direct_work_phone as phone, list_date as date\
    FROM listings\
    WHERE\
      list_agent_direct_work_phone <> \'\'\
  ),\
  \
  co_list_agents AS (\
    SELECT\
      (\'co_list_agents_\' || id) as id, co_list_agent_mui as mui, co_list_agent_direct_work_phone as phone, list_date as date\
    FROM listings\
    WHERE\
      co_list_agent_direct_work_phone <> \'\'\
  ),\
  \
  selling_agents AS (\
    SELECT\
      (\'selling_agents_\' || id) as id, selling_agent_mui as mui, selling_agent_direct_work_phone as phone, list_date as date\
    FROM listings\
    WHERE\
      selling_agent_direct_work_phone <> \'\'\
  ),\
  \
  co_selling_agents AS (\
    SELECT\
      (\'co_selling_agents_\' || id) as id, co_selling_agent_mui as mui, co_selling_agent_direct_work_phone as phone, list_date as date\
    FROM listings\
    WHERE\
      co_selling_agent_direct_work_phone <> \'\'\
  )\
  \
  SELECT * FROM stated_phones\
  UNION\
  SELECT * FROM stated_work_phones\
  UNION\
  SELECT * FROM list_agents\
  UNION\
  SELECT * FROM co_list_agents\
  UNION\
  SELECT * FROM selling_agents\
  UNION\
  SELECT * FROM co_selling_agents\
)'

const up = [
  'BEGIN',
  create,
  'CREATE UNIQUE INDEX agents_phones_idx ON agents_phones (id)',
  'CREATE INDEX agents_phones_mui ON agents_phones (mui)',
  'COMMIT'
]

const down = [
  'DROP MATERIALIZED VIEW agents_phones'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
