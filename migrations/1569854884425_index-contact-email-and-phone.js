const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts USING GIN (email)',
  'CREATE INDEX IF NOT EXISTS contacts_phone_idx ON contacts USING GIN (phone_number)',
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
