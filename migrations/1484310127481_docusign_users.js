'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE docusign_users (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    docusign_id uuid NOT NULL
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE docusign_users',
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
