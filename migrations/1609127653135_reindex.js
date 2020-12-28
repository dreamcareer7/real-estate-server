const db = require('../lib/utils/db')

const migrations = [
  'DROP INDEX listings_filters_status_order',
  'CREATE INDEX listings_filters_status_order ON listings_filters USING btree(public.order_listings(status))'
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
