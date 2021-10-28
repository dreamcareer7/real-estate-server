const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE super_campaigns_enrollments 
    ADD COLUMN campaign uuid REFERENCES email_campaigns (id)`,
  'COMMIT',
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
