const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings ALTER COLUMN notice_period DROP NOT NULL',
  'ALTER TABLE showings ADD COLUMN same_day_allowed boolean NOT NULL',
  'ALTER TABLE showings ADD CONSTRAINT s_same_day CHECK ((same_day_allowed IS FALSE AND notice_period IS NULL) OR (same_day_allowed IS TRUE AND notice_period IS NOT NULL))',
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
