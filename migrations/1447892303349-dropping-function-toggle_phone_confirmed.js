'use strict'

const db = require('../lib/utils/db')

const sql_up = 'DROP FUNCTION IF EXISTS toggle_phone_verification();'

const sql_down = 'CREATE OR REPLACE FUNCTION toggle_phone_confirmed() RETURNS TRIGGER AS $toggle_phone_confirmed$\
                BEGIN\
                UPDATE users\
                SET phone_confirmed = false\
                WHERE id = NEW.id;\
                RETURN NEW;\
                END;\
                $toggle_phone_confirmed$ language plpgsql;'

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
