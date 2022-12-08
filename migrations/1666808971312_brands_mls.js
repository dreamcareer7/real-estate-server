const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE IF NOT EXISTS brands_mls (
    id serial PRIMARY KEY,
    brand uuid NOT NULL REFERENCES brands (id),
    mls mls NOT NULL,
  
    UNIQUE (brand, mls)
  )
  `,
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
