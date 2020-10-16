const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE mailgun_domains (
      id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      mailgun_domain TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE
  )`,
  'ALTER TABLE emails ALTER domain TYPE text USING domain::text',
  `UPDATE emails SET domain = 'mg.rechat.com'
    WHERE domain = 'General'`,
  `UPDATE emails SET domain = 'mail.rechat.com'
    WHERE domain = 'Marketing'`,
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
