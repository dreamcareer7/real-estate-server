const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE listings ADD COLUMN IF NOT EXISTS sub_agency_offered text',
  'ALTER TABLE listings ADD COLUMN IF NOT EXISTS transaction_broker_commission text',
  'ALTER TABLE listings ADD COLUMN IF NOT EXISTS compensation_based_on text',
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
