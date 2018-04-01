'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TABLE IF NOT EXISTS search_filters(
  id uuid primary key not null DEFAULT public.uuid_generate_v1(),
  user_id uuid not null references users(id),
  filters jsonb not null,
  name text not null,
  is_pinned boolean not null,
  created_at timestamp with time zone not null DEFAULT clock_timestamp() ,
  updated_at timestamp with time zone not null DEFAULT clock_timestamp(),
  deleted_at timestamp with time zone
  )`
]

const down = [
  'BEGIN',
  'DROP TABLE search_filters',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)
    
    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)