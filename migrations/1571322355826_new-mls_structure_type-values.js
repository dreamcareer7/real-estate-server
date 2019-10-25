const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE mls_structure_type ADD VALUE IF NOT EXISTS \'ApartmentComplex\'',
  'ALTER TYPE mls_structure_type ADD VALUE IF NOT EXISTS \'ShoppingCenter\'',
  'ALTER TYPE mls_structure_type ADD VALUE IF NOT EXISTS \'Store\'',
  'ALTER TYPE mls_structure_type ADD VALUE IF NOT EXISTS \'Modular\''
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run()
    .then(cb)
    .catch(cb)
}

exports.down = () => {}
