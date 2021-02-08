const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP INDEX dailies_unique',
  'ALTER TABLE dailies ALTER created_at TYPE timestamp with time zone',
  'ALTER TABLE dailies ADD timezone text',
  'UPDATE dailies SET timezone = (SELECT timezone FROM users WHERE id = dailies."user")',
  'ALTER TABLE dailies ALTER timezone SET NOT NULL',
  `CREATE UNIQUE INDEX
    dailies_unique ON dailies("user", date_trunc('day', created_at AT TIME ZONE timezone))`,
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
