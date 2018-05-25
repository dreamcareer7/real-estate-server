'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'UPDATE activities SET is_visible = False WHERE action = \'UserCreatedContact\'',
  'COMMIT'
]

const down = [
  'BEGIN',
  'UPDATE activities SET is_visible = True WHERE action = \'UserCreatedContact\'',
  'COMMIT'
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
