const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE open_houses
   ADD tz TEXT DEFAULT 'CDT'`,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
