const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE email_campaigns (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid REFERENCES users(id),
    brand uuid REFERENCES brands(id),
    subject TEXT NOT NULL,
    include_signature BOOLEAN NOT NULL,
    html TEXT NOT NULL
   )`,
   'ALTER TABLE emails ADD campaign uuid REFERENCES email_campaigns(id)',
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
