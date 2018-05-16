'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE contacts
    ALTER created_at SET DEFAULT now(),
    ALTER updated_at SET DEFAULT now()`,
  `ALTER TABLE contacts_attributes
    ALTER created_at SET DEFAULT now(),
    ALTER updated_at SET DEFAULT now()`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `ALTER TABLE contacts
    ALTER created_at SET DEFAULT clock_timestamp(),
    ALTER updated_at SET DEFAULT clock_timestamp()`,
  `ALTER TABLE contacts_attributes
    ALTER created_at SET DEFAULT clock_timestamp(),
    ALTER updated_at SET DEFAULT clock_timestamp()`,
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
