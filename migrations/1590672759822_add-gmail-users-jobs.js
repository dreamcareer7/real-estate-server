const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DELETE FROM users_jobs',

  'ALTER TABLE google_credentials DROP COLUMN IF EXISTS calendars_last_sync_at',
  'ALTER TABLE google_credentials DROP COLUMN IF EXISTS threads_sync_history_id',
  'ALTER TABLE google_credentials DROP COLUMN IF EXISTS contacts_last_sync_at',

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  const g_result = await conn.query('SELECT * FROM google_credentials WHERE revoked IS FALSE AND deleted_at IS NULL')

  for(const row of g_result.rows) {
    const record = [row.user, row.brand, row.id, null, 'contacts', null, row.contacts_last_sync_at]

    await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (google_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record)

    if (row.google_calendar) {
      const record_2 = [row.user, row.brand, row.id, null, 'calendar', null, null]
      await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (google_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record_2)
    }
  }


  for(const sql of migrations) {
    await conn.query(sql)
  }


  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
