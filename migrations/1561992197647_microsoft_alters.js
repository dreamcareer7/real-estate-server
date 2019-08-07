const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `ALTER TABLE microsoft_contact_folders
    ADD COLUMN IF NOT EXISTS display_name TEXT`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS internet_message_id TEXT`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS subject TEXT`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS has_attachments Boolean`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS attachments JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS "from" JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS "to" JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS cc JSONB`,

  `ALTER TABLE microsoft_messages
    ADD COLUMN IF NOT EXISTS bcc JSONB`,
    

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