const db = require('../lib/utils/db')

const migrations = [
  'DROP INDEX CONCURRENTLY agents_phones_agent',
  'DROP INDEX CONCURRENTLY agents_emails_agent',

  'CREATE INDEX CONCURRENTLY agents_phones_agent ON agents_phones(mui, mls, phone)',
  'CREATE INDEX CONCURRENTLY agents_emails_agent ON agents_emails(mui, mls, email)'
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
