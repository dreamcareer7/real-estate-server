const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings ADD COLUMN human_readable_id serial NOT NULL',
  'CREATE INDEX showing_human_readable_id_idx ON showings (human_readable_id)',
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
