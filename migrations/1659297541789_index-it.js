const db = require('../lib/utils/db')

const migrations = [
  `CREATE INDEX CONCURRENTLY crm_tasks_last_touches
    ON crm_tasks(due_date, task_type, id) WHERE deleted_at IS NULL AND (task_type <> ALL ('{Note,Other}'::text[]))`
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
