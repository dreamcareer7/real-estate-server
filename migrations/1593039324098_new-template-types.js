const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE template_type ADD VALUE \'FathersDay\'',
  'ALTER TYPE template_type ADD VALUE \'MothersDay\'',
  'ALTER TYPE template_type ADD VALUE \'MemorialDay\'',
  'ALTER TYPE template_type ADD VALUE \'Passover\'',
  'ALTER TYPE template_type ADD VALUE \'ChineseNewYear\'',
  'ALTER TYPE template_type ADD VALUE \'LaborDay\'',
  'ALTER TYPE template_type ADD VALUE \'Hannukkah\'',
  'ALTER TYPE template_type ADD VALUE \'FourthOfJuly\'',
  'ALTER TYPE template_type ADD VALUE \'VeteransDay\'',
  'ALTER TYPE template_type ADD VALUE \'Thanksgiving\'',
  'ALTER TYPE template_type ADD VALUE \'Halloween\'',
  'ALTER TYPE template_type ADD VALUE \'MLKDay\'',
  'ALTER TYPE template_type ADD VALUE \'IndependenceDay\'',
  'ALTER TYPE template_type ADD VALUE \'Diwaly\'',
  'ALTER TYPE template_type ADD VALUE \'Rosh Hashanah\'',
  'ALTER TYPE template_type ADD VALUE \'Kwanzaa\'',
  'ALTER TYPE template_type ADD VALUE \'WeddingAnniversary\'',
  'ALTER TYPE template_type ADD VALUE \'HomeAnniversary\'',
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
