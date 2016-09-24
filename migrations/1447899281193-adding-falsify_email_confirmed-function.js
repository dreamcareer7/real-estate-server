'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE OR REPLACE FUNCTION falsify_email_confirmed() RETURNS TRIGGER AS $falsify_email_confirmed$\
                BEGIN\
                UPDATE users\
                SET email_confirmed = false\
                WHERE id = NEW.id;\
                RETURN NEW;\
                END;\
                $falsify_email_confirmed$ language plpgsql;'

const sql_down = 'DROP FUNCTION IF EXISTS falsify_email_confirmed();'

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
