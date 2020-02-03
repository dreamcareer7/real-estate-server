const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE crm_tasks DROP INDEX  IF EXISTS crm_tasks_gevent_id',
  'ALTER TABLE crm_tasks DROP COLUMN IF EXISTS google_event_id',

  'ALTER TABLE crm_tasks DROP INDEX  IF EXISTS crm_tasks_mevent_id',
  'ALTER TABLE crm_tasks DROP COLUMN IF EXISTS microsoft_event_id',


  `CREATE TABLE IF NOT EXISTS calendar_integration(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    rechat_id uuid NOT NULL,
    google_id uuid NULL REFERENCES google_calendar_events(id),
    microsoft_id uuid NULL REFERENCES microsoft_calendar_events(id),
    
    object_type TEXT,
    event_type TEXT,

    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,    

    UNIQUE (rechat_id, google_id, microsoft_id)
  )`,

  'CREATE UNIQUE INDEX IF NOT EXISTS calendar_integration_gid ON calendar_integration (google_id) WHERE google_id is NOT NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS calendar_integration_mid ON calendar_integration (microsoft_id) WHERE microsoft_id is NOT NULL',

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
