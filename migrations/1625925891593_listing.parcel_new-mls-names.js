const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'MCRTC\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'PBB\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'NYSA\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'NAVICA\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'IRES\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'NJMLS\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'CDAR\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'SBR\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'VAIL\'',
  'ALTER TYPE mls ADD VALUE IF NOT EXISTS \'AGS\'',
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
