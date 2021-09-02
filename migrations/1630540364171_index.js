const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX listings_filters_public_display ON listings_filters(public_display)'
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
