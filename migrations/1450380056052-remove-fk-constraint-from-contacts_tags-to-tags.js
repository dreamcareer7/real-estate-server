'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE contacts_tags DROP CONSTRAINT IF EXISTS contacts_tags_tag_fkey;'
const sql_down = 'ALTER TABLE contacts_tags \
ADD CONSTRAINT contacts_tags_tag_fkey FOREIGN KEY(tag) \
REFERENCES public.tags (id) MATCH SIMPLE \
ON UPDATE NO ACTION ON DELETE NO ACTION'

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
