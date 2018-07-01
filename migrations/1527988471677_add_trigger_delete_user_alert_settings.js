'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const fn = fs.readFileSync(__dirname + '/../lib/sql/alert/triggers/delete_alert_setting.fn.sql', 'utf8')

const up = [
  'BEGIN',
  fn,
  `CREATE TRIGGER delete_alert_setting AFTER DELETE ON rooms_users
  FOR EACH ROW EXECUTE PROCEDURE delete_alert_setting();
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
