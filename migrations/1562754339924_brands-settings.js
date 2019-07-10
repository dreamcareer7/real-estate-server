const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_settings (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    created_by uuid NOT NULL REFERENCES users (id),
    updated_by uuid NOT NULL REFERENCES users (id),

    created_within text NOT NULL,
    updated_within text NOT NULL,

    brand uuid NOT NULL REFERENCES brands (id),
    key text NOT NULL,
    value jsonb,

    UNIQUE (brand, key)
  )`,
  'CREATE INDEX brands_settings_brand_idx ON brands_settings (brand)',
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
