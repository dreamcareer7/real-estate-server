const db = require('../lib/utils/db')

const migrations = [
  `CREATE TABLE default_brands(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    brand uuid NOT NULL references brands(id)
  )`
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
