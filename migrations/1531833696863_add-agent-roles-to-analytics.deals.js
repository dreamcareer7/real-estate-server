'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const roles_view = fs.readFileSync(__dirname + '/../lib/sql/analytics/olap/roles_with_users.view.sql', 'utf-8')
const deals_view = fs.readFileSync(__dirname + '/../lib/sql/analytics/olap/deals.view.sql', 'utf-8')
const brands_branches = fs.readFileSync(__dirname + '/../lib/sql/brand/brands_branches.view.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP VIEW analytics.deals CASCADE',
  brands_branches,
  deals_view,
  roles_view,
  'COMMIT'
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
