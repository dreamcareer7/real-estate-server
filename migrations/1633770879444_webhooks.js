const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE brand_webhook_topic 
    AS ENUM('Showings')`,

  `CREATE TABLE brands_webhooks(
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamptz DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamptz,
    brand uuid NOT NULL REFERENCES brands(id),
    topic brand_webhook_topic NOT NULL,
    url TEXT,
    key TEXT NOT NULL
  )`,
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
