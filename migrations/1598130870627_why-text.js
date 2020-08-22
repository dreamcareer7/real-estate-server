const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE photos ALTER matrix_unique_id TYPE bigint USING (matrix_unique_id::bigint)',
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
