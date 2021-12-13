const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  
  `ALTER TABLE super_campaigns_enrollments
     ADD COLUMN created_by uuid REFERENCES users (id)`,

  `UPDATE super_campaigns_enrollments
     SET created_by = "user"
     WHERE detached`,

  `ALTER TABLE super_campaigns_enrollments
     DROP COLUMN detached`,
  
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
