const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_threads ADD COLUMN deleted_at timestamp with time zone',
  'DROP TRIGGER update_google_threads_on_new_messages ON google_messages',
  'DROP TRIGGER update_microsoft_threads_on_new_messages ON microsoft_messages',
  'DROP FUNCTION update_google_threads_on_new_messages()',
  'DROP FUNCTION update_microsoft_threads_on_new_messages()',
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
