const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX listings_filters_property_type    ON listings_filters(property_type)',
  'CREATE INDEX listings_filters_property_subtype ON listings_filters(property_subtype)',
  'COMMIT'
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
