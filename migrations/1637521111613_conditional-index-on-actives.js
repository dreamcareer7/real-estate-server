const db = require('../lib/utils/db')

const migrations = [
  'DROP INDEX CONCURRENTLY listings_filters_location_active',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_filters_status_location ON listings_filters USING gist (status, location)',
  'CREATE INDEX CONCURRENTLY photos_top_photo ON photos (listing_mui, mls, "order") WHERE deleted_at is null and url is not null'
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
