'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE deal_flag AS ENUM('Buying', 'Selling')`,
  `ALTER TABLE deals ADD flags deal_flag[]`,
  `CREATE TABLE brand_tasks (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    brand uuid NOT NULL REFERENCES brands(id),
    title TEXT NOT NULL,
    task_type task_type NOT NULL,
    form uuid REFERENCES forms(id),
    flags deal_flag[],
    "order" smallint
  )`,
  `CREATE TABLE brand_tasks_tags (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    tag uuid NOT NULL REFERENCES brands_tags(id),
    task uuid NOT NULL REFERENCES brand_tasks(id)
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE brand_tasks_tags',
  'DROP TABLE brand_tasks',
  'COMMIT'
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
