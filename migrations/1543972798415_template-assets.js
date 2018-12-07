'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE templates_user_assets (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    template uuid NOT NULL REFERENCES templates(id),
    created_by uuid NOT NULL REFERENCES users(id),
    listing uuid NOT NULL REFERENCES listings(id),
    contact uuid NOT NULL REFERENCES contacts(id),
    file uuid NOT NULL REFERENCES files(id)
   )`,
  'COMMIT'
]

const down = []

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
