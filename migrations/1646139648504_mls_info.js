const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE mls_info (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    mls mls NOT NULL UNIQUE,
    disclaimer text,
    logo text
  )`,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => { }
