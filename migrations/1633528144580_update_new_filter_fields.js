const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'UPDATE listings_filters SET bathroom_count=properties.bathroom_count FROM properties WHERE listings_filters.matrix_unique_id=properties.matrix_unique_id',
  'UPDATE listings_filters SET lot_size_area=properties.lot_size_area FROM properties WHERE listings_filters.matrix_unique_id=properties.matrix_unique_id',
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
