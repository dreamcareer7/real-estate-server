const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS public.distribution_lists
  (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
      email text NOT NULL UNIQUE,
      first_name text,
      last_name text,
      title text,
      city text,
      state text,
      postal_code text NOT NULL,
      country text,
      phone text,
      updated_at timestamp with time zone DEFAULT clock_timestamp(),
      deleted_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT clock_timestamp()
  )
  `,
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
