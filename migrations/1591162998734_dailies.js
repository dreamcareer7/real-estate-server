const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE dailies (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user" uuid NOT NULL REFERENCES users(id),
    email uuid NOT NULL REFERENCES emails(id),
    created_at timestamp without time zone NOT NULL DEFAULT NOW()
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
