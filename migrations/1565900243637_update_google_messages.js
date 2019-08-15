const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_messages RENAME "from" TO from_raw',
  'ALTER TABLE google_messages RENAME "to" TO to_raw',
  'ALTER TABLE google_messages RENAME "cc" TO cc_raw',
  'ALTER TABLE google_messages RENAME "bcc" TO bcc_raw',

  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS "from" TEXT',
  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS "to" TEXT[]',
  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS cc TEXT[]',
  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS bcc TEXT[]',

  'ALTER TABLE google_messages ADD COLUMN IF NOT EXISTS thread_key TEXT',

  'CREATE UNIQUE INDEX IF NOT EXISTS google_messages_thread_key ON google_messages (thread_key)',

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
