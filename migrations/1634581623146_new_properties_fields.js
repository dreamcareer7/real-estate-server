const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE properties ADD pets_policy TEXT',
  'ALTER TABLE properties ADD amenities TEXT[]',
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
