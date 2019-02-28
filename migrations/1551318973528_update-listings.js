const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'UPDATE  listings SET updated_at = updated_at', // Trigger update for listings_filters
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
