const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE billing_plans ALTER chargebee_id SET NOT NULL',
  'ALTER TABLE billing_plans ALTER chargebee_object SET NOT NULL',
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
