const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TABLE brands_subscriptions',
  'ALTER TABLE chargebee_subscriptions RENAME TO brands_subscriptions',
  'ALTER TABLE brands_subscriptions ADD brand uuid NOT NULL REFERENCES brands(id)',
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
