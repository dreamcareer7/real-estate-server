'use strict'

const db = require('../lib/utils/db')

const sql_up = 'ALTER TABLE property_rooms \
ADD CONSTRAINT property_rooms_listings_fkey FOREIGN KEY(listing) \
REFERENCES public.listings (id) MATCH SIMPLE \
ON UPDATE NO ACTION ON DELETE NO ACTION;'

const sql_down = 'ALTER TABLE property_rooms DROP CONSTRAINT property_rooms_listings_fkey;'

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
