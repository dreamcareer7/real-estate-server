const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX agents_mlsid_lower ON agents(LOWER(mlsid))',
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
