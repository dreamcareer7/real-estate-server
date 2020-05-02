const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_assets (
      id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
      created_at timestamp with time zone DEFAULT clock_timestamp(),
      updated_at timestamp with time zone,
      deleted_at timestamp with time zone,
      created_by uuid NOT NULL references users(id),
      brand uuid NOT NULL REFERENCES brands(id),
      file uuid NOT NULL REFERENCES files(id)
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
