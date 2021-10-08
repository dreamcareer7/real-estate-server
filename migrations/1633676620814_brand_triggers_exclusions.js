const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brand_triggers_exclusions (
    brand_trigger uuid NOT NULL REFERENCES brand_triggers (id),
    contact uuid NOT NULL REFERENCES contacts (id),
    PRIMARY KEY (brand_trigger, contact)
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
