const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TYPE brand_setting RENAME TO brand_setting_old',

  `CREATE TYPE brand_setting AS ENUM(
    'synced-contacts-last-seen',
    'enable-open-house-requests',
    'enable-yard-sign-requests'
   )`,

  'ALTER TABLE brands_settings ALTER COLUMN key TYPE text',

  `UPDATE brands_settings
    SET key = 'synced-contacts-last-seen'`,

  'ALTER TABLE brands_settings ALTER COLUMN key TYPE brand_setting USING key::brand_setting',

  'DROP TYPE brand_setting_old',

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
