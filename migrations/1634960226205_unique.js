const db = require('../lib/utils/db')

const migrations = [
  'CREATE UNIQUE INDEX users_agents_unique ON users_agents("user", agent)'
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
