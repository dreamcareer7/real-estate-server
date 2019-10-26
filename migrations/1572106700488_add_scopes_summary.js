const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE google_credentials    DROP COLUMN IF EXISTS scope_summary',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS scope_summary',

  'ALTER TABLE google_credentials    ADD COLUMN IF NOT EXISTS scope_summary JSONB',
  'ALTER TABLE microsoft_credentials ADD COLUMN IF NOT EXISTS scope_summary JSONB',

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
