const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Rejected\'',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'Confirmed\'',
  'ALTER TYPE notification_action ADD VALUE IF NOT EXISTS \'GaveFeedbackFor\'',
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
