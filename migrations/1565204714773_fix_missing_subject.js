const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS subject TEXT',
  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS subject TEXT',

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
