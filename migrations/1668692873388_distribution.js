const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS public.distributions
  (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand uuid REFERENCES brands (id),
      created_by uuid REFERENCES users (id),
      title text,
      updated_at timestamp with time zone DEFAULT clock_timestamp(),
      deleted_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT clock_timestamp()
  )
  `,
  'ALTER TABLE distribution_lists ADD COLUMN distribution uuid NOT NULL REFERENCES distributions(id)',
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
