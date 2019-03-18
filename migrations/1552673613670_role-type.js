const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TYPE deal_role_type
   AS ENUM('Person', 'Organization')`,

  'ALTER TABLE deals_roles ADD role_type deal_role_type',

  `UPDATE deals_roles SET role_type = 'Organization'
    WHERE company_title IS NOT NULL`,

  `UPDATE deals_roles SET role_type = 'Person'
    WHERE legal_first_name IS NOT NULL OR legal_last_name IS NOT NULL
    AND role_type IS NULL`,

  `UPDATE deals_roles SET role_type = 'Person'
  WHERE role_type IS NULL
  AND legal_first_name IS NULL AND legal_last_name IS NULL`,

  'ALTER TABLE deals_roles ALTER role_type SET NOT NULL',

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
