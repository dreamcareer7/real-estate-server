const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE tasks ADD COLUMN origin uuid REFERENCES brands_checklists_tasks(id)',
  'ALTER TABLE brands_checklists_tasks ADD COLUMN tab_name TEXT',
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
