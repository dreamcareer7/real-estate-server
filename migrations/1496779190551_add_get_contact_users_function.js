'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const fs = require('fs')
const users = fs.readFileSync('./lib/sql/contact/get_contact_users.fn.sql').toString()

const up = [
  users
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
