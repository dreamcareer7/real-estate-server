const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE geo_confidence_mapbox ADD VALUE IF NOT EXISTS \'approximate\'',
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
