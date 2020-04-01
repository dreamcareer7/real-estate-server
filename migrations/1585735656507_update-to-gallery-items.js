const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE gallery_items ALTER name SET NOT NULL',
  'ALTER TABLE gallery_items DROP description',
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
