const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE de.deals (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    deal uuid NOT NULL REFERENCES deals(id) UNIQUE,
    is_finalized boolean NOT NULL DEFAULT FALSE
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
