const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_credentials ALTER COLUMN access_token  TYPE TEXT',
  'ALTER TABLE google_credentials ALTER COLUMN refresh_token TYPE TEXT',

  'ALTER TABLE google_credentials DROP CONSTRAINT IF EXISTS google_credentials_access_token_key',
  'ALTER TABLE google_credentials DROP CONSTRAINT IF EXISTS google_credentials_refresh_token_key',

  'ALTER TABLE microsoft_credentials DROP CONSTRAINT IF EXISTS microsoft_credentials_access_token_key',
  'ALTER TABLE microsoft_credentials DROP CONSTRAINT IF EXISTS microsoft_credentials_refresh_token_key',

  'ALTER TABLE google_credentials ALTER COLUMN expiry_date TYPE BIGINT',

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
