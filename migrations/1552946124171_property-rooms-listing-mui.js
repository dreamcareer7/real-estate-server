const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX property_rooms_listing_mui ON property_rooms(listing_mui)',
  'ALTER TABLE alerts ADD master_bedroom_in_first_floor BOOLEAN NOT NULL DEFAULT FALSE',
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
