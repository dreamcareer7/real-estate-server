'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE email_domain
    AS ENUM('General', 'Marketing')`,
  `ALTER TABLE emails ADD domain email_domain
    NOT NULL DEFAULT 'General'`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE emails DROP domain',
  'DROP TYPE email_domain',
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
