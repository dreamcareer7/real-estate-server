'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_mls_context = fs.readFileSync(__dirname + '/../lib/sql/deal/context/get_mls_context.fn.sql', 'utf-8')

const up = [
  `CREATE TYPE mls_context AS
    (
      key TEXT,
      text TEXT,
      number numeric,
      date numeric,
      listing uuid
    )`,
  get_mls_context
]

const down = [
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
