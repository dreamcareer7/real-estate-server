'use strict'

const db = require('../lib/utils/db')

const sql_up = 'DROP INDEX IF EXISTS contacts_tags_contact_tag_idx;'
const sql_down = 'CREATE UNIQUE INDEX IF NOT EXISTS contacts_tags_contact_tag_idx on contacts_tags(contact, tag);'

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
