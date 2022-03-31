const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interval_unit') THEN
      CREATE TYPE interval_unit AS ENUM (
        'hours',
        'days',
        'weeks',
        'months',
        'years'
      );
    END IF;
  END
  $$;`,  
  `ALTER TABLE brands_flow_steps
    ADD COLUMN IF NOT EXISTS wait_for_unit interval_unit`,
  'COMMIT',
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
