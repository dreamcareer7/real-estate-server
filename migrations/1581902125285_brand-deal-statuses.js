const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_deal_statuses (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
      created_at timestamp with time zone DEFAULT clock_timestamp(),
      updated_at timestamp with time zone,
      deleted_at timestamp with time zone,
      brand uuid REFERENCES brands(id),
      label TEXT,
      color TEXT NOT NULL,
      deal_types deal_type[] NOT NULL,
      property_types deal_property_type[] NOT NULL,
      admin_only BOOLEAN NOT NULL,

      UNIQUE(brand, label)
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
