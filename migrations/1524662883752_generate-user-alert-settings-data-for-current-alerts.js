'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  ` 
  INSERT INTO user_alert_settings (SELECT u.id as "user", a.id, 'Enabled' FROM alerts a 
    INNER JOIN rooms_users ru USING(room)
    INNER JOIN users u ON (ru."user" = u.id) 
  )
  `
  ,
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
