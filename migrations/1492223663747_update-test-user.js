'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'UPDATE users SET user_type = \'Agent\', features = \'["Deals"]\' WHERE email = \'test@rechat.com\''
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
