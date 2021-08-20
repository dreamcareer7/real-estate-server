const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX CONCURRENTLY contacts_created_by ON contacts(created_by)',
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
