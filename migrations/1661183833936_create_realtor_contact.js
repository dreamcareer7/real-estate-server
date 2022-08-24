const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  ` CREATE TABLE realtor_contacts (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact uuid NOT NULL REFERENCES contacts(id) UNIQUE,
    raw jsonb NOT NULL
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
