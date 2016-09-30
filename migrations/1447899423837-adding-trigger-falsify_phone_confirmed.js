'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TRIGGER falsify_email_confirmed\
                AFTER UPDATE ON users\
                FOR EACH ROW\
                WHEN (OLD.email IS DISTINCT FROM NEW.email)\
                EXECUTE PROCEDURE falsify_email_confirmed();'

const sql_down = 'DROP TRIGGER falsify_email_confirmed ON users;'

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
