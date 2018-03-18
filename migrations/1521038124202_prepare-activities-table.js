'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE activities ADD COLUMN brand uuid REFERENCES brands(id)',
  'ALTER TABLE activities ADD COLUMN created_by uuid REFERENCES users(id)',
  'ALTER TABLE activities ADD COLUMN description text',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE activities DROP COLUMN brand',
  'ALTER TABLE activities DROP COLUMN created_by',
  'ALTER TABLE activities DROP COLUMN description',
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
