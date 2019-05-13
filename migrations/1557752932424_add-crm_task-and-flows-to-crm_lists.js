const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE crm_lists
    ADD COLUMN crm_task uuid[],
    ADD COLUMN flows uuid[]`,
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
