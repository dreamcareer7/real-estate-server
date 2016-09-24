'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['CREATE TYPE office_status AS ENUM (\'N\',\'Deceased\', \'\', \'Terminated\', \'Active\', \'Inactive\');']

const down = ['DROP TYPE office_status']

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
