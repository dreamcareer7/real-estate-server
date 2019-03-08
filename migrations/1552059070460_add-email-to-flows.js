const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE brands_flow_steps
    ADD COLUMN email uuid REFERENCES brands_emails (id),
    ADD COLUMN is_automated boolean NOT NULL`,
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
