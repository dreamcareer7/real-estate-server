'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE crm_tasks DROP notification',
  'ALTER TABLE reminder DROP notification',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_tasks ADD COLUMN notification uuid REFERENCES notifications(id)',
  'ALTER TABLE reminder ADD COLUMN notification uuid REFERENCES notifications(id)',
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
