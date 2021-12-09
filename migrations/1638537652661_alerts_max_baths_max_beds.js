const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE alerts ADD COLUMN IF NOT EXISTS maximum_bedrooms smallint',
  'ALTER TABLE alerts ADD COLUMN IF NOT EXISTS maximum_bathrooms smallint',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => { }
