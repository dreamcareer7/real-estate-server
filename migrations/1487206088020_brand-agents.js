'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const fn = fs.readFileSync('./lib/sql/brand/get_brand_agents.fn.sql').toString()

const up = [
  'BEGIN',
  'CREATE INDEX brands_users_brand   ON brands_users(brand)',
  'CREATE INDEX brands_agents_brand  ON brands_agents(brand)',
  'CREATE INDEX brands_offices_brand ON brands_offices(brand)',

  'CREATE INDEX brands_users_user     ON brands_users("user")',
  'CREATE INDEX brands_agents_agent   ON brands_agents(agent)',
  'CREATE INDEX brands_offices_office ON brands_offices(office)',

  fn,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_brand_agents(id uuid)',

  'DROP INDEX brands_users_brand',
  'DROP INDEX brands_agents_brand',
  'DROP INDEX brands_offices_brand',

  'DROP INDEX brands_users_user',
  'DROP INDEX brands_agents_agent',
  'DROP INDEX brands_offices_office',

  'COMMIT'
]

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
