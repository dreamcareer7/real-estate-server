const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_gevent_id',

  'CREATE UNIQUE INDEX IF NOT EXISTS crm_tasks_gevent_id ON crm_tasks (google_event_id) WHERE google_event_id is NOT null',

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
