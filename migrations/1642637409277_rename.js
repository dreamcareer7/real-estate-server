const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE move_easy_credentials RENAME username TO "user"',
  'ALTER TABLE move_easy_credentials RENAME password TO pass',
  'ALTER TABLE move_easy_credentials ADD url TEXT NOT NULL',
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
