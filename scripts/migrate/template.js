const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DO SOMETHING',
  'DO SOMETHING ELSE',
  'EVEN DO MORE',
  'COMMIT'
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
