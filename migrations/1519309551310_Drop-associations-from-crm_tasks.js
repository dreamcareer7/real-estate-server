'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE crm_tasks DROP deal',
  'ALTER TABLE crm_tasks DROP contact',
  'ALTER TABLE crm_tasks DROP listing',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE crm_tasks ADD contact uuid REFERENCES contacts(id)',
  'ALTER TABLE crm_tasks ADD deal uuid REFERENCES deals(id)',
  'ALTER TABLE crm_tasks ADD listing uuid REFERENCES listings(id)',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
