'use strict'

const db = require('../lib/utils/db')

const sql_up = 'INSERT INTO tags(name) VALUES\
  (\'buyer\'),\
  (\'seller\'),\
(\'rental and lease\'),\
  (\'investor\'),\
  (\'broker and agent\'),\
  (\'vendors\'),\
  (\'home inspector\'),\
  (\'lender\'),\
  (\'title company\'),\
  (\'lawyer\'),\
  (\'contractor\'),\
  (\'appraisal\');'

const sql_down = 'DELETE FROM tags'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up)
exports.down = runSql(sql_down)
