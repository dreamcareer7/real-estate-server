const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE brands_flows
    ADD COLUMN created_within text,
    ADD COLUMN updated_within text,
    ADD COLUMN deleted_within text`,
  `ALTER TABLE brands_flow_steps
    ADD COLUMN created_within text,
    ADD COLUMN updated_within text,
    ADD COLUMN deleted_within text`,
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
