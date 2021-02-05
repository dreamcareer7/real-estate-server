const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_contacts    ALTER COLUMN contact SET NOT NULL',
  'ALTER TABLE microsoft_contacts ALTER COLUMN contact SET NOT NULL',

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
