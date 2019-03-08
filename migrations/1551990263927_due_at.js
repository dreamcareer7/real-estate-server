const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE email_campaigns ADD due_at timestamp with time zone',
  'ALTER TABLE email_campaigns ADD executed_at timestamp with time zone',
  'ALTER TABLE email_campaigns ADD "from" uuid NOT NULL REFERENCES users(id)',
  `CREATE TABLE email_campaigns_recipients (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    campaign uuid NOT NULL REFERENCES email_campaigns(id),
    tag text,
    list uuid REFERENCES crm_lists(id),
    contact uuid REFERENCES contacts(id),
    email text
  )`,
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
