const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brand_triggers_exclusions (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    brand_trigger uuid NOT NULL REFERENCES brand_triggers (id),
    contact uuid NOT NULL REFERENCES contacts (id),
    deleted_at timestamp
  )`,
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
