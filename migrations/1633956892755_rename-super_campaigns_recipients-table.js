const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE super_campaigns_recipients RENAME TO super_campaigns_eligibility',
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
