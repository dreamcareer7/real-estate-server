const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TYPE time_step AS ENUM (
    'hours',
    'days',
    'weeks',
    'months',
    'years'
  )`,
  `ALTER TABLE brands_flow_steps
    ADD COLUMN wait_for_unit time_step`,
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
