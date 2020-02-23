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

    start_at timestamptz NULL,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz
  )`,

  'ALTER TABLE users_jobs ADD CONSTRAINT users_jobs_gc_jname UNIQUE (google_credential, job_name)',
  'ALTER TABLE users_jobs ADD CONSTRAINT users_jobs_mc_jname UNIQUE (microsoft_credential, job_name)',

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
