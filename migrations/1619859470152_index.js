const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'CREATE INDEX template_instances_relations_instance ON templates_instances_relations(instance)',
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
