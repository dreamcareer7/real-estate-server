const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX calendar_integration_origin_crm_task ON calendar_integration(origin, crm_task)',
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
