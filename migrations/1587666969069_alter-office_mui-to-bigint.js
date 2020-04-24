const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE offices ALTER COLUMN office_mui TYPE bigint USING office_mui::bigint',
  'ALTER TABLE agents ALTER COLUMN office_mui TYPE bigint USING office_mui::bigint',
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
