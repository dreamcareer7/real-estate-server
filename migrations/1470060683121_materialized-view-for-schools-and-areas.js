'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const areas = fs.readFileSync('./lib/sql/listing/area/mls_areas.mv.sql').toString()
const schools = fs.readFileSync('./lib/sql/school/schools.mv.sql').toString()

const up = [
  areas,
  schools
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
