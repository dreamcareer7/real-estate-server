const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX brands_roles_brand ON brands_roles(brand)',
  'CREATE INDEX brands_hostnames_brand ON brands_hostnames(brand)',
  'CREATE INDEX brand_settings_brand ON brand_settings(brand)',
  'CREATE INDEX brands_parent ON brands(parent)',
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
