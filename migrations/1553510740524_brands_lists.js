const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS brands_lists (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    brand uuid REFERENCES brands (id) ON DELETE CASCADE,

    name text NOT NULL CHECK (name <> ''),
    filters jsonb[],
    query text,
    touch_freq integer CHECK (touch_freq IS NULL OR touch_freq > 0),
    is_and_filter boolean NOT NULL DEFAULT TRUE
  )`,
  'CREATE INDEX brands_lists_brand_idx ON brands_lists (brand)',
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
