const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE crm_association_type ADD VALUE \'address\'',
  'BEGIN',
  'ALTER TABLE crm_associations ADD address stdaddr',
  'ALTER TABLE crm_associations ADD location geometry(Point, 4326)',
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
