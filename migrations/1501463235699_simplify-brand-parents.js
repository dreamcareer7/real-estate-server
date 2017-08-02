'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const fs = require('fs')
const brand_children = fs.readFileSync('./lib/sql/brand/brand_children.fn.sql').toString()


const up = [
  'BEGIN',
  'ALTER TABLE brands ADD parent uuid REFERENCES brands(id)',
  'UPDATE brands SET parent = (SELECT parent FROM brands_parents WHERE brand = brands.id)',
  'DROP TABLE brands_parents',
  brand_children,
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
