const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE IF NOT EXISTS users_jobs(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    google_credential uuid NULL REFERENCES google_credentials(id),
    microsoft_credential uuid NULL REFERENCES google_credentials(id),

    job_name TEXT,
    status TEXT,

    start_at timestamptz NULL clock_timestamp(),

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  'CREATE UNIQUE INDEX IF NOT EXISTS users_jobs_gc_jname ON users_jobs (google_credential, job_name)    WHERE google_credential    is NOT NULL AND job_name IS NOT NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS users_jobs_mc_jname ON users_jobs (microsoft_credential, job_name) WHERE microsoft_credential is NOT NULL AND job_name IS NOT NULL',

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
