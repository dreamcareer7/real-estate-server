const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'FathersDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'MothersDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'MemorialDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Passover\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'ChineseNewYear\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'LaborDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Hannukkah\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'FourthOfJuly\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'VeteransDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Thanksgiving\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Halloween\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'MLKDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'IndependenceDay\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Diwaly\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Rosh Hashanah\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'Kwanzaa\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'WeddingAnniversary\'',
  'ALTER TYPE template_type ADD VALUE IF NOT EXISTS \'HomeAnniversary\''
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
