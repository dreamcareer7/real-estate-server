'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const fs = require('fs')
const agents = fs.readFileSync('./lib/sql/brand/get_brand_agents.fn.sql').toString()
const propose = fs.readFileSync('./lib/sql/brand/propose_brand_agents.fn.sql').toString()

const up = [
  'BEGIN',
  'DROP FUNCTION IF EXISTS get_brand_agents(uuid)',
  'DROP FUNCTION IF EXISTS propose_brand_agents(uuid, uuid)',
//   agents,
//   propose,
  'COMMIT'
]

const down = [
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
