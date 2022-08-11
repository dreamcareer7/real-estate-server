const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE super_campaigns
     ADD CONSTRAINT null_due_at_if_null_template_instance
       CHECK (due_at IS NULL OR template_instance IS NOT NULL)`,
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
