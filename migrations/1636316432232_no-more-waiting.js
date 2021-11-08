const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE users_jobs SET status = 'deleted'
    WHERE deleted_at IS NOT NULL`,
  `UPDATE users_jobs SET status = 'waiting' 
    WHERE status IS NULL`,
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
