'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `INSERT INTO user_alert_settings("user", alert)
  (SELECT ru."user", a.id as alert from rooms_users ru INNER JOIN alerts a ON ru.room = a.room)
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
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
