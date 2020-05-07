const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_deal_statuses RENAME archived TO is_arvhived',
  'ALTER TABLE brands_deal_statuses ALTER is_arvhived SET DEFAULT FALSE',
  'ALTER TABLE brands_deal_statuses ADD is_active BOOLEAN NOT NULL DEFAULT FALSE',
  'ALTER TABLE brands_deal_statuses ADD is_pending BOOLEAN NOT NULL DEFAULT FALSE',
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
