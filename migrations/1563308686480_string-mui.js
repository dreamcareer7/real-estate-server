const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE mls_data ALTER matrix_unique_id  SET DATA TYPE text',
  'ALTER TABLE photos   ALTER matrix_unique_id  SET DATA TYPE text',
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
