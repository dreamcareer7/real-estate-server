const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings_availabilities DROP CONSTRAINT sr_enforce_bounds',
  `ALTER TABLE showings_availabilities ADD CONSTRAINT sr_enforce_bounds CHECK (
    lower_inc(availability)
    AND NOT upper_inc(availability)
    AND availability <@ int4range(0, 24 * 3600)
  )`,
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
