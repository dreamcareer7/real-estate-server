const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE calendar_object_type ADD VALUE \'contact\'',
  'ALTER TYPE calendar_object_type ADD VALUE \'email_campaign\'',
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
