const db = require('../lib/utils/db')

const migrations = [
  `CREATE INDEX CONCURRENTLY listings_filters_location_active ON public.listings_filters 
    USING gist (location) where status = 'Active'`
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
