const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE geo_source ADD VALUE \'Mapbox\'',
  `CREATE TYPE geo_confidence_mapbox AS ENUM (
    'rooftop',
    'parcel',
    'point',
    'interpolated',
    'intersection',
    'street'
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
