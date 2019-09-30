const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_messages ADD CONSTRAINT microsoft_messages_credential_internet_message_id_key UNIQUE (microsoft_credential, internet_message_id)',

  'ALTER TABLE microsoft_messages ALTER COLUMN internet_message_id SET NOT NULL',

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
