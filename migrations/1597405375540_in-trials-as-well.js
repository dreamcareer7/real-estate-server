const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP INDEX chargebee_active_subscriptions',
  `CREATE UNIQUE INDEX chargebee_active_subscriptions
    ON chargebee_subscriptions(customer, plan) WHERE (status = 'active' OR status = 'in_trial')`,
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
