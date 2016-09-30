'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const counties = fs.readFileSync('./lib/sql/listing/county/counties.mv.sql').toString()
const subdivs = fs.readFileSync('./lib/sql/listing/subdivision/subdivisions.mv.sql').toString()

const up = [
  counties,
  subdivs
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
