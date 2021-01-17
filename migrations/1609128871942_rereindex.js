const db = require('../lib/utils/db')

const migrations = [
  'DROP INDEX listings_filters_status_order',

  'CREATE INDEX listings_filters_status_order ON listings_filters USING btree(order_listings(status))',

  `CREATE OR REPLACE FUNCTION order_listings(listing_status) RETURNS integer
    AS 'SELECT CASE $1
      WHEN ''Coming Soon''::public.listing_status            THEN 0
      WHEN ''Active''::public.listing_status                 THEN 1

      WHEN ''Active Option Contract''::public.listing_status THEN 2
      WHEN ''Active Contingent''::public.listing_status      THEN 2
      WHEN ''Active Kick Out''::public.listing_status        THEN 2

      WHEN ''Pending''::public.listing_status         THEN 3
      WHEN ''Sold''::public.listing_status            THEN 3
      WHEN ''Leased''::public.listing_status          THEN 3

      ELSE 4
    END'
    IMMUTABLE
    LANGUAGE SQL`
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
