const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'UPDATE microsoft_messages SET new_message_id= null WHERE new_message_id=\'not_found\'',
  'ALTER TABLE microsoft_messages RENAME COLUMN message_id TO old_message_id',
  'ALTER TABLE microsoft_messages ALTER COLUMN old_message_id DROP NOT NULL',
  'ALTER TABLE microsoft_messages RENAME COLUMN new_message_id TO message_id',
  'CREATE UNIQUE INDEX microsoft_messages_on_multi_fields_when_not_deleted_key ON public.microsoft_messages (microsoft_credential, message_id) WHERE (message_id IS NOT NULL)',
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
