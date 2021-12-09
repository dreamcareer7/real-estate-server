const db = require('../lib/utils/db')

const MSSHD = 'mls_saved_search_hint_dismissed'

const migrations = [
  'BEGIN',
  `ALTER TABLE users_settings
     ALTER COLUMN ${MSSHD} TYPE boolean USING coalesce(${MSSHD}, 0) <> 0,
     ALTER COLUMN ${MSSHD} SET DEFAULT FALSE,
     ALTER COLUMN ${MSSHD} SET NOT NULL`,
  'COMMIT',
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
