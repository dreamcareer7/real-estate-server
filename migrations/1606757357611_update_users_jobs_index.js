const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE users_jobs DROP CONSTRAINT IF EXISTS users_jobs_gc_jname',
  'ALTER TABLE users_jobs DROP CONSTRAINT IF EXISTS users_jobs_mc_jname',

  'ALTER TABLE users_jobs ADD COLUMN IF NOT EXISTS recurrence BOOLEAN DEFAULT TRUE',

  'CREATE UNIQUE INDEX IF NOT EXISTS users_jobs_gc_jname ON users_jobs (google_credential, jname)    WHERE recurrence IS TRUE',
  'CREATE UNIQUE INDEX IF NOT EXISTS users_jobs_mc_jname ON users_jobs (microsoft_credential, jname) WHERE recurrence IS TRUE',

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
