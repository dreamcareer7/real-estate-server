const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_messages RENAME "from" TO from_raw',
  'ALTER TABLE microsoft_messages RENAME "to" TO to_raw',
  'ALTER TABLE microsoft_messages RENAME "cc" TO cc_raw',
  'ALTER TABLE microsoft_messages RENAME "bcc" TO bcc_raw',

  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS "from" TEXT',
  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS "to" TEXT[]',
  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS cc TEXT[]',
  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS bcc TEXT[]',

  'ALTER TABLE microsoft_messages ADD COLUMN IF NOT EXISTS thread_key TEXT',

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
