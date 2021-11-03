const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brand_triggers_exclusions (
    brand uuid NOT NULL REFERENCES brands (id),
    event_type text NOT NULL,
    contact uuid NOT NULL REFERENCES contacts (id),
    PRIMARY KEY (brand, event_type, contact)
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
