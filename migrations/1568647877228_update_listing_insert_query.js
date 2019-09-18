const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'CREATE TYPE mls_transaction_type AS ENUM(\'rental\', \'sale\')',
  'CREATE TYPE mls_usage_type       AS ENUM(\'xxx\', \'zzz\')',
  'CREATE TYPE mls_structure_type   AS ENUM(\'xxx\', \'zzz\')',

  'ALTER TABLE listings ADD COULMN IF NOT EXISTS transaction_type mls_property_type   NOT NULL DEFAULT \'rental\'',
  'ALTER TABLE listings ADD COULMN IF NOT EXISTS usage_type       mls_usage_type      NOT NULL DEFAULT \'xxx\'',
  'ALTER TABLE listings ADD COULMN IF NOT EXISTS structure_type   mls_structure_type  NOT NULL DEFAULT \'xxx\'',

  'ALTER TABLE listings ADD COULMN IF NOT EXISTS original_mls_property_type TEXT',
  'ALTER TABLE listings ADD COULMN IF NOT EXISTS original_mls_property_subtype TEXT',
  'ALTER TABLE listings ADD COULMN IF NOT EXISTS original_mls_status TEXT',

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
