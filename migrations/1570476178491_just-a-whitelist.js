const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `INSERT INTO brands_allowed_templates (brand, template)

   SELECT brands.id, templates.id
   FROM brands JOIN templates ON 1=1
   WHERE brands.brand_type = 'Brokerage'
   AND templates.id NOT IN(SELECT template FROM brands_allowed_templates)`,

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
