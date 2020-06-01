const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS calendars_last_sync_at',

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }


  const g_result = await conn.query('SELECT * FROM microsoft_credentials WHERE revoked IS FALSE AND deleted_at IS NULL')

  for(const row of g_result.rows) {
    if (row.microsoft_calendar) {
      const record = [row.user, row.brand, null, row.id, 'calendar', null, null ]
  
      await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7 ) ON CONFLICT (microsoft_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record)
    }
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
