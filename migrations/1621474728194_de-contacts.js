const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE de.contacts (
    id INT NOT NULL PRIMARY KEY,
    contact UUID UNIQUE,
    object jsonb
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
