const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE crm_leads (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT now(),
    brand uuid NOT NULL REFERENCES brands (id),
    "user" uuid NOT NULL REFERENCES users (id),
    data xml
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
