const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'UPDATE contacts SET display_name = nickname WHERE nickname IS NOT NULL AND nickname IS DISTINCT FROM display_name',
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
