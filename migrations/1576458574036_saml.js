const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TABLE sso_providers (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    identifier TEXT NOT NULL,
    client uuid NOT NULL REFERENCES clients(id),
    config jsonb NOT NULL
  )`,

  `CREATE TABLE sso_users (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    "user" uuid NOT NULL REFERENCES users(id),
    source uuid NOT NULL REFERENCES sso_providers(id),
    foreign_id TEXT NOT NULL,
    profile jsonb NOT NULL,

    UNIQUE(foreign_id, source, "user")
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
