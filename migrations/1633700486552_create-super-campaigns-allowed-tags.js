const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE super_campaigns_allowed_tags (
    brand uuid NOT NULL REFERENCES brands (id),
    "user" uuid NOT NULL REFERENCES users (id),
    tag text NOT NULL,
    PRIMARY KEY (brand, "user", tag)
  )`,
  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => run().then(cb, cb)

exports.down = () => {}
