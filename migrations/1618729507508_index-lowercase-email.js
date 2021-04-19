const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX users_email_lowercase ON users(LOWER(email))',
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
