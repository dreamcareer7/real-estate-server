const db = require('../lib/utils/db')

const ITV = 'import_tooltip_visited'

const migrations = [
  'BEGIN',
  `ALTER TABLE users_settings
     ALTER COLUMN ${ITV} TYPE boolean USING coalesce(${ITV}, 0) <> 0,
     ALTER COLUMN ${ITV} SET DEFAULT FALSE,
     ALTER COLUMN ${ITV} SET NOT NULL`,
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
