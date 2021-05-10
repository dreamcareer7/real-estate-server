const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE INDEX email_threads_microsoft_credential_idx ON email_threads (microsoft_credential)
    WHERE deleted_at IS NULL`,
  `CREATE INDEX email_threads_google_credential_idx ON email_threads (google_credential)
    WHERE deleted_at IS NULL`,
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
