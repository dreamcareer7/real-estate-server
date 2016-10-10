'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const words = fs.readFileSync('./lib/sql/listing/words.mv.sql').toString()

const up = [
  words
]

const down = []

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
