const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TYPE IF NOT EXISTS interval_unit AS ENUM (
    'hours',
    'days',
    'weeks',
    'months',
    'years'
  )`,
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
