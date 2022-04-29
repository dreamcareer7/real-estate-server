const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TYPE listing_notification_subscription AS
    ENUM('JustListed', 'OpenHouse', 'PriceImprovement', 'JustSold')`,
  'ALTER TABLE listing_notification_subscriptions ADD types listing_notification_subscription[]',
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
