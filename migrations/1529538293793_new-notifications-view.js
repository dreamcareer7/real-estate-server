'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const view = fs.readFileSync(__dirname + '/../lib/sql/notification/new_notifications.view.sql').toString()

const up = [
  'BEGIN',
  'DROP FUNCTION get_new_notifications(uuid[], uuid)',
  view,
  'COMMIT'
]

const down = []

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
