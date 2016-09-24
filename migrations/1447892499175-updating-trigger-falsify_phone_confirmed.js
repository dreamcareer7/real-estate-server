'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TRIGGER falsify_phone_confirmed\
                AFTER UPDATE ON users\
                FOR EACH ROW\
                WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)\
                EXECUTE PROCEDURE falsify_phone_confirmed();'

const sql_down = 'DROP TRIGGER falsify_phone_confirmed ON users;'

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
