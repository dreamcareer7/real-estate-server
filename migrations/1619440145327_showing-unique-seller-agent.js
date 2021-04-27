const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE UNIQUE INDEX sr_unique_seller_agent ON showings_roles (showing)
    WHERE deleted_at IS NULL AND role = 'SellerAgent'::deal_role`,
  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
