const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS google_event_id UUID',

  'ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_gevent_id UNIQUE (google_event_id)',

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
