const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TYPE task_type
    ADD VALUE 'Application'`,
  `CREATE TABLE applications (
    id uuid NOT NUlL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp with time zone,
    url TEXT NOT NULL
  )`,
  'ALTER TABLE tasks ADD COLUMN application uuid REFERENCES applications(id)',
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
