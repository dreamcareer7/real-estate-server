const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE distribution_lists RENAME TO distribution_lists_contacts',
  'ALTER TABLE distributions RENAME TO distribution_lists',
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
