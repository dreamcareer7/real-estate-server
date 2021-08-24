const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE users_agents (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    agent uuid NOT NULL REFERENCES agents(id)
  )`,
  `INSERT INTO users_agents ("user", agent)
   SELECT id, agent FROM users WHERE agent IS NOT NULL`,
  'ALTER TABLE users DROP agent',
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
