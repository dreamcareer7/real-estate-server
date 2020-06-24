const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE envelopes ADD owner uuid REFERENCES users(id)',
  'UPDATE envelopes SET owner = created_by',
  'ALTER TABLE envelopes ALTER owner SET NOT NULL',
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
