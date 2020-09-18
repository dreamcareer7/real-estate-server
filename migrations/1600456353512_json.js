const db = require('../lib/utils/db')

const migrations = [
  'ALTER TABLE brands_form_templates ALTER value TYPE jsonb USING value::jsonb'
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
