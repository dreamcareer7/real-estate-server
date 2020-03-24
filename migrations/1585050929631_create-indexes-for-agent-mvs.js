const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE UNIQUE INDEX agents_phones_idx ON agents_phones (id)',
  'CREATE INDEX agents_phones_phone ON agents_phones (phone)',
  'CREATE INDEX agents_phones_agent ON agents_phones (mui, mls)',

  'CREATE UNIQUE INDEX agents_emails_idx ON agents_emails (id)',
  'CREATE INDEX agents_emails_email ON agents_emails (LOWER(email))',
  'CREATE INDEX agents_emails_agent ON agents_emails (mui, mls)',

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
