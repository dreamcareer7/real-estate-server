const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX listings_filters_close_date ON listings_filters(close_date)'
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
