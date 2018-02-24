'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const mlsareas = require('fs').readFileSync('./lib/sql/listing/area/mls_areas.mv.sql').toString()
const counties = require('fs').readFileSync('./lib/sql/listing/county/counties.mv.sql').toString()
const subdivisions = require('fs').readFileSync('./lib/sql/listing/subdivision/subdivisions.mv.sql').toString()
const schools = require('fs').readFileSync('./lib/sql/school/schools.mv.sql').toString()

const up = [
  'BEGIN',
  'DROP MATERIALIZED VIEW mls_areas',
  'DROP MATERIALIZED VIEW counties',
  'DROP MATERIALIZED VIEW subdivisions',
  'DROP MATERIALIZED VIEW schools',
  mlsareas,
  counties,
  subdivisions,
  schools,
  'COMMIT'
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
