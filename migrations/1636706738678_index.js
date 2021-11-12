const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX websites_hostnames_hostname ON websites_hostnames(LOWER(hostname))',
  'CREATE INDEX brands_hostnames_hostname ON brands_hostnames(LOWER(hostname))',
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
