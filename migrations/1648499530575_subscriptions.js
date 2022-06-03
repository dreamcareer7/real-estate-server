const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE listing_notification_subscriptions (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "user" uuid NOT NULL REFERENCES users(id),
    email TEXT NOT NULL
  )`,
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
