const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE move_easy_deals (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal uuid NOT NULL REFERENCES deals(id) UNIQUE,
    last_synced JSONB NOT NULL,
    move_easy_id TEXT NOT NULL UNIQUE
  )`,

  `CREATE TABLE move_easy_credentials (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand    uuid NOT NULL REFERENCES brands(id),
    username TEXT NOT NULL,
    password TEXT NOT NULL
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
