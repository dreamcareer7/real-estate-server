'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE crm_emails (
    id uuid DEFAULT public.uuid_generate_v1() NOT NULL PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    contact uuid REFERENCES contacts(id),
    email uuid NOT NULL REFERENCES emails(id)
  )`,
  'COMMIT'
]

const down = [
  'DROP TABLE crm_emails'
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
