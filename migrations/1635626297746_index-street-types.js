const db = require('../lib/utils/db')

const migrations = [
  'CREATE INDEX street_type_lookup_name ON street_type_lookup (lower(name))'
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
