const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE docusign_users ADD COLUMN created_at timestamp without time zone NOT NULL DEFAULT NOW()',
  'ALTER TABLE docusign_users ADD COLUMN updated_at timestamp without time zone NOT NULL DEFAULT NOW()',
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
