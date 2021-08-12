const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX http_requests_user_created_at ON http_requests(user_id, created_at) WHERE user_id IS NOT NULL'
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
