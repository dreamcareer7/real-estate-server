const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX brands_checklists_tasks_checklist ON brands_checklists_tasks(checklist)',
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
