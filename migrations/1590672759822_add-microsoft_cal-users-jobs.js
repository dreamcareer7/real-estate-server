const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS sync_status',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS last_sync_at',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS last_sync_duration',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS contacts_last_sync_at',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS contacts_last_extract_at',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS messages_last_sync_at',
  'ALTER TABLE microsoft_credentials DROP COLUMN IF EXISTS calendars_last_sync_at',

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  const g_result = await conn.query('SELECT * FROM microsoft_credentials WHERE revoked IS FALSE AND deleted_at IS NULL')

  for(const row of g_result.rows) {
    const record_1 = [row.user, row.brand, null, row.id, 'outlook', null, row.messages_last_sync_at]
    await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (microsoft_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record_1)

    const record_2 = [row.user, row.brand, null, row.id, 'contacts', null, row.contacts_last_sync_at]
    await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (microsoft_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record_2)


    if (row.microsoft_calendar) {
      const record_3 = [row.user, row.brand, null, row.id, 'calendar', null, null]
      await conn.query('INSERT INTO users_jobs("user", brand, google_credential, microsoft_credential, job_name, status, start_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (microsoft_credential, job_name) DO UPDATE SET status = null, start_at = null, updated_at = null', record_3)
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
