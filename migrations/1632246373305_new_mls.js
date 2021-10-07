const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'SABOR\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'SBR\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'NAPLES\'',
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
