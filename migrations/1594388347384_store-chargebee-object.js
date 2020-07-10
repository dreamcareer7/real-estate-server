const db = require('../lib/utils/db')

const migrations = [
  'ALTER TABLE billing_plans ADD COLUMN chargebee_object JSONB NOT NULL'
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
