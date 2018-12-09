'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE template_input AS
    ENUM('listing', 'user', 'contact', 'listings')`,
  'ALTER TABLE templates ADD template_inputs template_input[]',
  'ALTER TABLE templates DROP width',
  'ALTER TABLE templates DROP height',
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
