const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE TYPE notification_app AS ENUM (
     'rechat',
     'showingapp'
   )`,

  `ALTER TABLE notifications_tokens
     ADD COLUMN app notification_app NOT NULL DEFAULT 'rechat'::notification_app`,
  
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
