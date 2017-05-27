'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const fs = require('fs')
const users = fs.readFileSync('./lib/sql/brand/get_brand_users.fn.sql').toString()
const agents = fs.readFileSync('./lib/sql/brand/get_brand_agents.fn.sql').toString()
const propose = fs.readFileSync('./lib/sql/brand/lib/sql/brand/propose_brand_agents.fn.sql').toString()

const up = [
  'BEGIN',
  'DROP TABLE brands_agents',
  users,
  agents,
  propose,
  'COMMIT'
]

const down = [
  `CREATE TABLE brands_agents (
    id uuid NOT NULL DEFAULT uuid_generate_v1(),
    brand uuid NOT NULL REFERENCES brands(id),
    agent uuid NOT NULL REFERENCES agents (id)
  )`
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
