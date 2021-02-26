const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE form_libraries (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    deleted_at timestamp without time zone,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE form_libraries_brands (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v1(),
    library uuid NOT NULL REFERENCES form_libraries(id),
    brand uuid NOT NULL REFERENCES brands(id)
  )`,
  'ALTER TABLE forms ADD library uuid REFERENCES form_libraries(id)',
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
