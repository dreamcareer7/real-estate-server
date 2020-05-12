const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE addresses
    ADD COLUMN location_mapbox geometry(Point,4326),
    ADD COLUMN geocoded_mapbox boolean,
    ADD COLUMN corrupted_mapbox boolean,
    ADD COLUMN geo_source_formatted_address_mapbox text,
    ADD COLUMN geo_confidence_mapbox geo_confidence_mapbox`,
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
