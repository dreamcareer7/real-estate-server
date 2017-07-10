'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TYPE review_status AS ENUM(\'Pending\', \'Rejected\', \'Approved\')',
  `CREATE TABLE reviews (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT CLOCK_TIMESTAMP()
  )`,
  `
  CREATE TABLE reviews_history (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    review uuid NOT NULL REFERENCES reviews(id),
    status review_status NOT NULL DEFAULT \'Pending\',
    created_at timestamp with time zone NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    created_by uuid NOT NULL REFERENCES users(id)
  )`,
  'DROP TYPE task_status', // We had a type with same name long ago.
  'CREATE TYPE task_type AS ENUM(\'Generic\', \'Form\')',
  'CREATE TYPE task_status AS ENUM(\'New\', \'InProgress\', \'Done\')',
  `CREATE TABLE tasks (
    id uuid DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    room uuid NOT NULL REFERENCES rooms(id),
    deal uuid NOT NULL REFERENCES deals(id),
    title TEXT NOT NULL,
    status task_status NOT NULL DEFAULT 'New',
    task_type task_type NOT NULL,
    submission uuid REFERENCES forms_submissions(id),
    review uuid REFERENCES reviews(id)
   )`,
  'ALTER TYPE room_type ADD VALUE \'Task\'',
  'ALTER TABLE forms_submissions DROP deal',
]

const down = [
  'BEGIN',
  'DROP TABLE tasks',
  'DROP TYPE task_status',
  'DROP TYPE task_type',
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
