const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_emails (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid REFERENCES users(id),
    brand uuid REFERENCES brands(id),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    subject TEXT NOT NULL,
    include_signature BOOLEAN NOT NULL,
    body TEXT NOT NULL
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
