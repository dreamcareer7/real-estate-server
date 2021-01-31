const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `DELETE FROM dailies WHERE
    created_at < (NOW() - '1 day'::interval)`,
  `CREATE UNIQUE INDEX
    dailies_unique ON dailies("user", date_trunc('day', created_at))`,
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
