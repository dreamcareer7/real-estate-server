'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TABLE brands_roles_tags',
  'DROP TABLE tasks_tags',
  'DROP TABLE brand_tasks_tags',
  'DROP TABLE brands_tags',
  'DROP TABLE brand_tasks',


  `CREATE TABLE deals_checklists (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deactivted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    deal uuid NOT NULL REFERENCES deals(id),
    "order" smallint NOT NULL DEFAULT 1
  )`,

  'ALTER TABLE tasks ADD checklist uuid NOT NULL REFERENCES deals_checklists(id)',
  'ALTER TABLE tasks DROP deal',

  `CREATE TABLE brands_checklists (
     id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     deleted_at TIMESTAMP WITH TIME ZONE,
     brand uuid NOT NULL REFERENCES brands(id),
     title TEXT NOT NULL,
     flags deal_flag[],
     "order" smallint NOT NULL DEFAULT 1
   )`,

   `CREATE TABLE brands_checklists_tasks (
      id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      checklist uuid NOT NULL REFERENCES brands_checklists(id),
      title TEXT NOT NULL,
      task_type task_type NOT NULL,
      form uuid REFERENCES forms(id),
      "order" smallint NOT NULL DEFAULT 1
    )`,

  'COMMIT'
]

const down = []

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
