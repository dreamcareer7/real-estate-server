const db = require('../lib/utils/db')

const migrations = [
  'ALTER TABLE email_campaigns ALTER delivered TYPE integer',
  'ALTER TABLE email_campaigns ALTER opened TYPE integer'
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
