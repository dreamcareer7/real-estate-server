const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_subscriptions ADD plan_quantity SMALLINT',
  `UPDATE brands_subscriptions
    SET plan_quantity = (chargebee_object->'plan_quantity')::smallint`,
  'ALTER TABLE brands_subscriptions ALTER plan_quantity SET NOT NULL',
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
