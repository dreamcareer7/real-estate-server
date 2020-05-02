const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_deal_statuses ADD archived BOOLEAN',
  'UPDATE brands_deal_statuses SET archived = false',
  'ALTER TABLE brands_deal_statuses ALTER archived SET NOT NULL',
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
