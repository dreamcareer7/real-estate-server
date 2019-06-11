const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'DROP TABLE brands_checklists_allowed_forms',
  'ALTER TABLE forms ADD brand uuid REFERENCES brands(id)',
  'ALTER TABLE forms DROP fields',
  'ALTER TABLE forms DROP formstack_id',
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
