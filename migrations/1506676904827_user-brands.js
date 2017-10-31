'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const user_brands = require('fs').readFileSync('./lib/sql/brand/get_user_brands.fn.sql').toString()

const up = [
  'BEGIN',
  user_brands,
  'COMMIT'
]

const down = [
  'DROP FUNCTION user_brands("user")'
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
