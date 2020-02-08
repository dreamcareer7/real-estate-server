const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE calendar_integration DROP CONSTRAINT IF EXISTS calendar_integration_rechat_id_google_id_microsoft_id_key',

  'ALTER TABLE calendar_integration DROP COLUMN IF EXISTS rechat_id',

  'ALTER TABLE calendar_integration ADD COLUMN IF NOT EXISTS crm_task           UUID NULL REFERENCES crm_tasks(id)',
  'ALTER TABLE calendar_integration ADD COLUMN IF NOT EXISTS contact            UUID NULL REFERENCES contacts(id)',
  'ALTER TABLE calendar_integration ADD COLUMN IF NOT EXISTS contact_attribute  UUID NULL REFERENCES contacts_attributes(id)',
  'ALTER TABLE calendar_integration ADD COLUMN IF NOT EXISTS deal_context       UUID NULL REFERENCES deal_context(id)',

  `CREATE TYPE public.calendar_integration_origin
    AS ENUM ('google', 'microsoft', 'rechat')`,

  'ALTER TABLE calendar_integration DROP COLUMN IF EXISTS origin',
  'ALTER TABLE calendar_integration ADD COLUMN origin public.calendar_integration_origin NOT NULL',

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