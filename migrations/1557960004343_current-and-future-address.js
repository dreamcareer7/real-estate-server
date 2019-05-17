const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE deals_roles ADD current_address TEXT',
  'ALTER TABLE deals_roles ADD future_address  TEXT',
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
