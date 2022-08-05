const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE godaddy_domains
     ALTER COLUMN "order" TYPE bigint`,
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
