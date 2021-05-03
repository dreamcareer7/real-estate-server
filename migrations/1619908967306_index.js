const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX recommendations_eav_recommendation ON recommendations_eav(recommendation)',
  'CREATE INDEX google_messages_deleted_at ON google_messages(deleted_at)',
  'CREATE INDEX microsoftmessages_deleted_at ON microsoft_messages(deleted_at)',
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
