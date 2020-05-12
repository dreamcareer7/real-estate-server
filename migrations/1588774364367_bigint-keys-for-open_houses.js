const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE open_houses
    ALTER COLUMN matrix_unique_id TYPE bigint USING matrix_unique_id::bigint,
    ALTER COLUMN listing_mui TYPE bigint USING listing_mui::bigint`,
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
