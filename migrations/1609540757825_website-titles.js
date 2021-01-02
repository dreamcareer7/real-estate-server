const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE websites_snapshots ADD title TEXT NOT NULL DEFAULT \'Untitled\'',
  'ALTER TABLE websites_snapshots ADD template_instance UUID REFERENCES templates_instances(id)',
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
