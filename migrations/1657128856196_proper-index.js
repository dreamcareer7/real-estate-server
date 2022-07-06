const db = require('../lib/utils/db')

const migrations = [
  'DROP INDEX CONCURRENTLY IF EXISTS microsoft_messages_thread_key_not_deleted',
  'CREATE INDEX CONCURRENTLY microsoft_messages_thread_key ON microsoft_messages(thread_key)',
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
