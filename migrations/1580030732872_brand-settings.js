const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_settings ADD text TEXT',
  'ALTER TABLE brands_settings ADD number FLOAT',
  'ALTER TABLE brands_settings ADD date timestamp without time zone',
  'ALTER TABLE brands_settings ADD boolean BOOLEAN',
  'UPDATE brands_settings SET date = value::text::timestamp without time zone',
  `UPDATE brands_settings
    SET key = 'SyncedContactsLastSeen'`,
  'ALTER TABLE brands_settings DROP value',
  `CREATE TYPE brand_setting AS ENUM(
    'SyncedContactsLastSeen'
   )`,
   'ALTER TABLE brands_settings ALTER COLUMN key TYPE brand_setting USING key::brand_setting',
   `ALTER TABLE brands_settings ADD CONSTRAINT type CHECK(
       (text    IS NOT NULL AND (number IS NULL AND date   IS NULL AND boolean IS NULL))
    OR (number  IS NOT NULL AND (text   IS NULL AND date   IS NULL AND boolean IS NULL))
    OR (date    IS NOT NULL AND (text   IS NULL AND number IS NULL AND boolean IS NULL))
    OR (boolean IS NOT NULL AND (text   IS NULL AND number IS NULL AND date    IS NULL))
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
