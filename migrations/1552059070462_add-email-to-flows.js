const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE brands_flow_steps
    ADD COLUMN IF NOT EXISTS email uuid REFERENCES brands_emails (id),
    ADD COLUMN IF NOT EXISTS is_automated boolean`,

  'UPDATE brands_flow_steps SET is_automated = FALSE',

  'ALTER TABLE brands_flow_steps ALTER is_automated SET NOT NULL',

  `CREATE TABLE IF NOT EXISTS flows_emails (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    deleted_at timestamptz,
  
    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid REFERENCES users (id),
    deleted_by uuid REFERENCES users (id),
  
    origin uuid NOT NULL REFERENCES brands_emails (id),
    email uuid REFERENCES email_campaigns (id)
  )`,
  `ALTER TABLE flows_steps
    ADD COLUMN IF NOT EXISTS email uuid REFERENCES flows_emails (id)`,
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
