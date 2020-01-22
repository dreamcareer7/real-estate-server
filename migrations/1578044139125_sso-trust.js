const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE sso_users ADD created_at timestamp with time zone DEFAULT clock_timestamp()',
  'ALTER TABLE sso_users ADD updated_at timestamp with time zone DEFAULT clock_timestamp()',
  'ALTER TABLE sso_users ADD deleted_at timestamp with time zone',
  'ALTER TABLE sso_users ADD trusted_at timestamp with time zone',
  'UPDATE sso_users SET trusted_at = NOW()',
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
