'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE forms (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone default NOW(),
    updated_at timestamp with time zone default NOW(),
    deleted_at timestamp with time zone,
    formstack_id integer unique,
    fields JSON DEFAULT '{}'
  )`,

  `CREATE TABLE forms_submissions (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone default NOW(),
    updated_at timestamp with time zone default NOW(),
    deleted_at timestamp with time zone,
    form uuid REFERENCES forms(id),
    formstack_id integer
  )`,

  `CREATE TABLE forms_data (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone default NOW(),
    updated_at timestamp with time zone default NOW(),
    deleted_at timestamp with time zone,
    submission uuid REFERENCES forms_submissions(id),
    form uuid REFERENCES forms(id),
    author uuid REFERENCES users(id),
    values JSON,
    formstack_response JSON
  )`,

  'COMMIT'
]

const down = [
  'DROP TABLE forms_submissions',
  'DROP TABLE forms'
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
