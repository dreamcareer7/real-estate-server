const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE de.deals ADD COLUMN created_at timestamp with time zone NOT NULL DEFAULT NOW()',
  'ALTER TABLE de.deals ADD COLUMN updated_at timestamp with time zone NOT NULL DEFAULT NOW()',
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
