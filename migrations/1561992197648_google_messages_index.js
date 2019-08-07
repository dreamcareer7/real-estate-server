const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE INDEX IF NOT EXISTS google_messages_recipients_idx
    ON "google_messages" USING GIN ("recipients")`,

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