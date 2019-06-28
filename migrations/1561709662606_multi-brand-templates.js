const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_allowed_templates (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    template uuid NOT NULL REFERENCES templates(id),
    brand uuid NOT NULL REFERENCES brands(id)
  )`,

  `INSERT INTO brands_allowed_templates
   SELECT uuid_generate_v1() as id,
          id as template,
          brand
   FROM templates
   WHERE brand IS NOT NULL`,

   'ALTER TABLE templates DROP brand',

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
