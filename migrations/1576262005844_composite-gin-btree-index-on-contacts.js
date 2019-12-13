const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE EXTENSION btree_gin',
  'CREATE INDEX contacts_brand_email_idx ON contacts USING gin (brand, email)',
  'CREATE INDEX email_threads_brand_recipients_idx ON email_threads USING gin (brand, recipients)',
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
