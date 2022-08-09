const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX microsoft_messages_credendial_recipient ON microsoft_messages USING gin (id, microsoft_credential, recipients) WHERE deleted_at IS NULL',
  'CREATE INDEX google_messages_credendial_recipient    ON google_messages    USING gin (id, google_credential, recipients)    WHERE deleted_at IS NULL',
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
