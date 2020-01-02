const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE users ALTER password DROP NOT NULL',
  'ALTER TABLE sso_users RENAME source TO provider',
  'ALTER TABLE sso_providers ADD created_at timestamp with time zone DEFAULT clock_timestamp()',
  'ALTER TABLE sso_providers ADD updated_at timestamp with time zone DEFAULT clock_timestamp()',
  'ALTER TABLE sso_providers ADD deleted_at timestamp with time zone',
  'ALTER TABLE sso_providers ADD name TEXT',
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
