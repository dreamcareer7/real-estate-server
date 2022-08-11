const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE move_easy_deals ADD COLUMN contract uuid NOT NULL REFERENCES deals_checklists(id)',
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
