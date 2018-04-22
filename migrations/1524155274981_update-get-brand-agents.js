'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_brand_agents = fs.readFileSync(__dirname + '/../lib/sql/brand/get_brand_agents.fn.sql', 'utf-8')

const up = [
  get_brand_agents,
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
